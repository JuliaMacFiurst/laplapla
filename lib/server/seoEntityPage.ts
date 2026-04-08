import countryNames from "@/utils/country_names.json";
import { getMapPopupContent } from "@/lib/server/mapPopup/getMapPopupContent";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { Lang } from "@/i18n";
import type { MapPopupType } from "@/types/mapPopup";
import type { GroupedStories, SeoEntityType } from "@/components/SeoEntityPage";

type MapStoryTypeRow = {
  type: MapPopupType;
  language: string;
};

const SUPPORTED_GROUP_TYPES: Array<keyof GroupedStories> = [
  "country",
  "culture",
  "food",
  "animal",
  "weather",
  "river",
  "sea",
  "physic",
];

export function normalizeEntitySlug(value: string) {
  return decodeURIComponent(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugToDisplayTitle(slug: string) {
  return decodeURIComponent(String(slug || ""))
    .trim()
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function createEmptyGroups(): GroupedStories {
  return {
    country: [],
    culture: [],
    food: [],
    animal: [],
    weather: [],
    river: [],
    sea: [],
    physic: [],
  };
}

function resolveCountryDisplayTitle(slug: string) {
  const normalizedSlug = normalizeEntitySlug(slug);
  const countryEntry = (countryNames as Record<string, { en?: string }>)[normalizedSlug];
  return typeof countryEntry?.en === "string" && countryEntry.en.trim()
    ? countryEntry.en.trim()
    : slugToDisplayTitle(normalizedSlug);
}

export function resolveEntityDisplayTitle(entityType: SeoEntityType, slug: string) {
  if (entityType === "country") {
    return resolveCountryDisplayTitle(slug);
  }

  return slugToDisplayTitle(normalizeEntitySlug(slug));
}

async function loadStoryTypes(targetId: string, lang: Lang) {
  const supabase = createServerSupabaseClient();
  const languages = Array.from(new Set([lang, "ru"]));
  const { data, error } = await supabase
    .from("map_stories")
    .select("type, language")
    .eq("target_id", targetId)
    .in("language", languages);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as MapStoryTypeRow[]) : [];
}

export async function loadSeoEntityPageData(entityType: SeoEntityType, slug: string, lang: Lang) {
  const normalizedSlug = normalizeEntitySlug(slug);
  const title = resolveEntityDisplayTitle(entityType, normalizedSlug);
  const groupedStories = createEmptyGroups();
  const storyTypeRows = await loadStoryTypes(normalizedSlug, lang);
  const availableTypes = Array.from(
    new Set(
      storyTypeRows
        .map((row) => row.type)
        .filter((type): type is keyof GroupedStories => SUPPORTED_GROUP_TYPES.includes(type as keyof GroupedStories)),
    ),
  );

  const resolvedStories = await Promise.all(
    availableTypes.map(async (type) => {
      const content = await getMapPopupContent({
        type,
        targetId: normalizedSlug,
        lang,
      });

      return content ? { type, content } : null;
    }),
  );

  for (const item of resolvedStories) {
    if (!item) {
      continue;
    }

    groupedStories[item.type].push(item.content);
  }

  const hasAnyStories = SUPPORTED_GROUP_TYPES.some((type) => groupedStories[type].length > 0);

  return {
    title,
    groupedStories,
    hasAnyStories,
  };
}
