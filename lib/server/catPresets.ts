import { CAT_PRESETS, type AnyCatPreset, type CatPresetMediaType } from "@/content/cats";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { Lang } from "@/i18n";
import { normalizeCatCategoryKey } from "@/lib/catCategories";

type CatPresetKind = "full" | "text";

type CatPresetRow = {
  id: string;
  legacy_id: string | null;
  base_key: string | null;
  kind: CatPresetKind | null;
  lang: string | null;
  prompt: string | null;
  category: string | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type CatPresetSlideRow = {
  id: string;
  preset_id: string;
  slide_order: number | null;
  text: string | null;
  media_url: string | null;
  media_type: CatPresetMediaType | null;
};

type CatPresetTranslationRow = {
  content_id: string | number | null;
  translation: unknown;
};

type CatPresetTranslation = {
  prompt?: unknown;
  category?: unknown;
  slides?: unknown;
};

type CatPresetTranslatedSlide = {
  order?: unknown;
  text?: unknown;
};

const SUPPORTED_LANGS = new Set<Lang>(["ru", "en", "he"]);
const MEDIA_TYPES = new Set<CatPresetMediaType>(["gif", "video"]);

function normalizeLang(value: string | undefined): Lang {
  return value && SUPPORTED_LANGS.has(value as Lang) ? value as Lang : "ru";
}

function parseTranslation(value: unknown): CatPresetTranslation | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseTranslation(parsed);
    } catch {
      return null;
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? value as CatPresetTranslation
    : null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOrder(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getTranslatedSlideText(
  translation: CatPresetTranslation | null,
  fallbackSlide: CatPresetSlideRow,
  index: number,
) {
  if (!Array.isArray(translation?.slides)) {
    return normalizeText(fallbackSlide.text);
  }

  const translatedSlides = translation.slides as CatPresetTranslatedSlide[];
  const fallbackOrder = normalizeOrder(fallbackSlide.slide_order);
  const translatedSlide =
    translatedSlides.find((slide) => normalizeOrder(slide.order) === fallbackOrder) ??
    translatedSlides[index];

  return normalizeText(translatedSlide?.text) || normalizeText(fallbackSlide.text);
}

function mapDbPresetToRuntimePreset(
  preset: CatPresetRow,
  slides: CatPresetSlideRow[],
  lang: Lang,
  translation: CatPresetTranslation | null,
): AnyCatPreset | null {
  if (!preset.id || preset.kind !== "full" && preset.kind !== "text") {
    return null;
  }

  const fallbackPrompt = normalizeText(preset.prompt);
  const translatedPrompt = lang === "ru" ? fallbackPrompt : normalizeText(translation?.prompt);
  const prompt = translatedPrompt || fallbackPrompt;

  if (!prompt) {
    return null;
  }

  const sortedSlides = slides
    .filter((slide) => normalizeText(slide.text))
    .sort((left, right) => (left.slide_order ?? 0) - (right.slide_order ?? 0));

  if (sortedSlides.length === 0) {
    return null;
  }

  const translated = lang === "ru" || Boolean(translation);
  const fallbackCategory = normalizeText(preset.category);
  const translatedCategory = lang === "ru" ? fallbackCategory : normalizeText(translation?.category);
  const categoryKey = normalizeCatCategoryKey(fallbackCategory);
  const categoryLabel = translatedCategory || fallbackCategory;
  const common = {
    id: `db:${preset.id}`,
    lang,
    prompt,
    translated,
    category: fallbackCategory || null,
    categoryKey: categoryKey || null,
    categoryLabel: categoryLabel || null,
  };

  if (preset.kind === "text") {
    const texts = sortedSlides
      .map((slide, index) => getTranslatedSlideText(translation, slide, index))
      .filter(Boolean);

    return texts.length
      ? { ...common, kind: "text", texts }
      : null;
  }

  const fullSlides = sortedSlides
    .map((slide, index) => {
      const mediaUrl = normalizeText(slide.media_url);
      const mediaType = slide.media_type;
      const order = slide.slide_order ?? index + 1;

      if (!mediaUrl || !mediaType || !MEDIA_TYPES.has(mediaType)) {
        return null;
      }

      return {
        order,
        text: getTranslatedSlideText(translation, slide, index),
        mediaUrl,
        mediaType,
      };
    })
    .filter((slide): slide is NonNullable<typeof slide> => Boolean(slide?.text));

  return fullSlides.length
    ? { ...common, kind: "full", slides: fullSlides }
    : null;
}

function getHardcodedCatPresetsForLang(lang: Lang) {
  return CAT_PRESETS
    .filter((preset) => preset.lang === lang)
    .map((preset) => {
      const fallbackCategory = normalizeText(preset.category);
      return {
        ...preset,
        translated: true,
        category: fallbackCategory || null,
        categoryKey: normalizeCatCategoryKey(fallbackCategory) || null,
        categoryLabel: fallbackCategory || null,
      };
    });
}

export async function loadCatPresetsFromDb(langInput: string | undefined): Promise<AnyCatPreset[]> {
  const lang = normalizeLang(langInput);

  try {
    const supabase = createServerSupabaseClient();
    const { data: presetRows, error: presetError } = await supabase
      .from("cat_presets")
      .select("id, legacy_id, base_key, kind, lang, prompt, category, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (presetError) {
      throw presetError;
    }

    const presets = (Array.isArray(presetRows) ? presetRows : []) as CatPresetRow[];
    const presetIds = presets.map((preset) => preset.id).filter(Boolean);

    if (presetIds.length === 0) {
      return [];
    }

    const { data: slideRows, error: slideError } = await supabase
      .from("cat_preset_slides")
      .select("id, preset_id, slide_order, text, media_url, media_type")
      .in("preset_id", presetIds)
      .order("slide_order", { ascending: true });

    if (slideError) {
      throw slideError;
    }

    const translationsByContentId = new Map<string, CatPresetTranslation>();

    if (lang !== "ru") {
      const { data: translationRows, error: translationError } = await supabase
        .from("content_translations")
        .select("content_id, translation")
        .eq("content_type", "cat_preset")
        .eq("language", lang)
        .in("content_id", presetIds);

      if (translationError) {
        throw translationError;
      }

      for (const row of (translationRows || []) as CatPresetTranslationRow[]) {
        const contentId = row.content_id == null ? "" : String(row.content_id);
        const translation = parseTranslation(row.translation);
        if (contentId && translation) {
          translationsByContentId.set(contentId, translation);
        }
      }
    }

    const slidesByPresetId = new Map<string, CatPresetSlideRow[]>();
    for (const slide of (slideRows || []) as CatPresetSlideRow[]) {
      const slides = slidesByPresetId.get(slide.preset_id) ?? [];
      slides.push(slide);
      slidesByPresetId.set(slide.preset_id, slides);
    }

    return presets
      .map((preset) => mapDbPresetToRuntimePreset(
        preset,
        slidesByPresetId.get(preset.id) ?? [],
        lang,
        translationsByContentId.get(preset.id) ?? null,
      ))
      .filter((preset): preset is AnyCatPreset => Boolean(preset));
  } catch (error) {
    console.warn("[cat-presets] failed to load Supabase cat presets; using hardcoded fallback", error);
    return [];
  }
}

export async function loadCombinedCatPresets(langInput: string | undefined): Promise<AnyCatPreset[]> {
  const lang = normalizeLang(langInput);
  const dbPresets = await loadCatPresetsFromDb(lang);

  if (dbPresets.length > 0) {
    return dbPresets;
  }

  return getHardcodedCatPresetsForLang(lang);
}
