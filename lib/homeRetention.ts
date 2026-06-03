import { getTranslationPayload } from "@/lib/contentTranslations";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { listR2Objects } from "@/lib/r2";
import { getRecipeExportImage, type Recipe } from "@/lib/recipes";
import { buildSupabasePublicUrl } from "@/lib/publicAssetUrls";
import type { Lang } from "@/i18n";
import flagCodeMap from "@/utils/confirmed_country_codes.json";
import countryNames from "@/utils/country_names.json";
import { loadLatestBedtimeStory } from "@/lib/bedtimeStories";

export type HomepageRetentionData = {
  recipe: {
    slug: string;
    title: string;
    imageUrl: string;
    countryName: string | null;
    flagUrl: string | null;
    targetId: string | null;
  } | null;
  dogLesson: {
    slug: string;
    title: string;
    previewUrl: string;
    dogImageUrl: string | null;
  } | null;
  bedtimeStory: {
    slug: string;
    title: string;
    previewUrl: string;
  } | null;
};

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  preview: string | null;
  created_at: string | null;
  publish_date?: string | null;
};

const LESSON_PREVIEW_URL_TTL_SECONDS = 60 * 60;
const FRANK_IMAGE_PATTERN = /\.(?:avif|gif|jpe?g|png|webp)$/i;
let cachedFrankImageUrl: string | null | undefined;

function normalizeTargetId(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function humanizeTargetId(value: string | null | undefined) {
  const normalized = normalizeTargetId(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type CountryNamesEntry = Partial<Record<Lang | "code", string>>;
const COUNTRY_NAMES = countryNames as Record<string, CountryNamesEntry>;

function findCountryEntry(value: string | null | undefined) {
  const normalized = normalizeTargetId(value);
  if (!normalized) {
    return null;
  }

  const directEntry = COUNTRY_NAMES[normalized];
  if (directEntry) {
    return { key: normalized, entry: directEntry };
  }

  for (const [key, entry] of Object.entries(COUNTRY_NAMES)) {
    if (
      normalizeTargetId(entry.ru) === normalized ||
      normalizeTargetId(entry.en) === normalized ||
      normalizeTargetId(entry.he) === normalized
    ) {
      return { key, entry };
    }
  }

  return null;
}

function getCountryName(targetId: string | null | undefined, lang: Lang, fallback?: string | null) {
  const normalized = normalizeTargetId(targetId);
  const match = findCountryEntry(normalized) || findCountryEntry(fallback);
  const translated = match?.entry[lang];

  return translated || fallback || humanizeTargetId(targetId);
}

function getFlagUrl(targetId: string | null | undefined, fallbackCountry?: string | null) {
  const normalized = normalizeTargetId(targetId) || normalizeTargetId(fallbackCountry);
  if (!normalized) {
    return null;
  }

  if (/^[a-z]{2}$/.test(normalized)) {
    return buildSupabasePublicUrl("flags-svg", `flags-svg/${normalized}.svg`);
  }

  const code = (flagCodeMap as Record<string, string>)[normalized];
  if (code) {
    return buildSupabasePublicUrl("flags-svg", `flags-svg/${code}.svg`);
  }

  const countryMatch = findCountryEntry(normalized);
  const countryCode = countryMatch?.entry.code;
  return countryCode ? buildSupabasePublicUrl("flags-svg", `flags-svg/${countryCode}.svg`) : null;
}

async function loadRecipeOfTheWeek(lang: Lang): Promise<HomepageRetentionData["recipe"]> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("recipes")
    .select("id, slug, title, image_url, exported_image_urls, country_target_id, country, created_at, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const recipes = (data || []) as Array<
    Pick<Recipe, "id" | "slug" | "title" | "image_url" | "exported_image_urls" | "country_target_id" | "country">
  >;
  const recipe = recipes.find((item) => getRecipeExportImage(item, lang) && item.image_url);
  if (!recipe) {
    return null;
  }

  const translation = lang === "ru" ? null : await getTranslationPayload("recipe", recipe.id, lang);
  const translatedTitle =
    translation && typeof translation.title === "string" && translation.title.trim()
      ? translation.title
      : recipe.title;
  const imageUrl = recipe.image_url;

  return imageUrl
    ? {
        slug: recipe.slug,
        title: translatedTitle,
        imageUrl,
        countryName: getCountryName(recipe.country_target_id, lang, recipe.country),
        flagUrl: getFlagUrl(recipe.country_target_id, recipe.country),
        targetId: recipe.country_target_id,
      }
    : null;
}

async function loadFrankImageUrl() {
  if (cachedFrankImageUrl !== undefined) {
    return cachedFrankImageUrl;
  }

  try {
    const images = await listR2Objects("stickers/dogs-stickers/frank/anims/");
    cachedFrankImageUrl =
      images.find((item) => /\/draw-poster\.(?:avif|gif|jpe?g|png|webp)$/i.test(item.key))?.url ||
      images.find((item) => /\/paint-poster\.(?:avif|gif|jpe?g|png|webp)$/i.test(item.key))?.url ||
      images.find((item) => FRANK_IMAGE_PATTERN.test(item.key))?.url ||
      null;
  } catch (error) {
    console.error("[home-retention] failed to load Frank image", error);
    cachedFrankImageUrl = null;
  }

  return cachedFrankImageUrl;
}

async function loadDogLessonOfTheWeek(lang: Lang): Promise<HomepageRetentionData["dogLesson"]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, slug, title, preview, created_at, publish_date")
    .not("preview", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const lesson = data as LessonRow | null;
  if (!lesson?.preview) {
    return null;
  }

  const { data: signedUrlData } = await supabase.storage
    .from("lessons")
    .createSignedUrl(lesson.preview, LESSON_PREVIEW_URL_TTL_SECONDS);
  const translation = lang === "ru" ? null : await getTranslationPayload("lesson", lesson.id, lang);
  const translatedTitle =
    translation && typeof translation.title === "string" && translation.title.trim()
      ? translation.title
      : lesson.title;

  return {
    slug: lesson.slug,
    title: translatedTitle,
    previewUrl: signedUrlData?.signedUrl || "",
    dogImageUrl: await loadFrankImageUrl(),
  };
}

export async function loadHomepageRetentionData(lang: Lang): Promise<HomepageRetentionData> {
  const [recipe, dogLesson, bedtimeStory] = await Promise.all([
    loadRecipeOfTheWeek(lang).catch((error) => {
      console.error("[home-retention] failed to load recipe", error);
      return null;
    }),
    loadDogLessonOfTheWeek(lang).catch((error) => {
      console.error("[home-retention] failed to load dog lesson", error);
      return null;
    }),
    loadLatestBedtimeStory(lang).catch((error) => {
      console.error("[home-retention] failed to load bedtime story", error);
      return null;
    }),
  ]);

  return {
    recipe,
    dogLesson,
    bedtimeStory: bedtimeStory
      ? {
          slug: bedtimeStory.slug,
          title: bedtimeStory.title,
          previewUrl: bedtimeStory.previewUrl,
        }
      : null,
  };
}
