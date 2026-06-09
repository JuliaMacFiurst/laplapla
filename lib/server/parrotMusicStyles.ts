import type { Lang } from "@/i18n";
import { iconForInstrument, iconForMusicStyle } from "@/utils/parrot-presets";
import { getParrotAudioUrl, getParrotStyleMediaUrl } from "@/lib/parrotMediaUrls";
import { isolateMixedBidiText } from "@/lib/i18n/bidi";
import {
  getHardcodedParrotStyleRecords,
  type ParrotStyleInstrument,
  type ParrotStyleRecord,
  type ParrotStyleSlide,
  type ParrotStyleVariant,
} from "@/lib/parrots/catalog";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type ParrotMusicStyleRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  icon_url: string | null;
  search_artist: string | null;
  search_genre: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at?: string | null;
};

type ParrotMusicStylePresetRow = {
  id: string;
  style_id: string;
  preset_key: string | null;
  title: string | null;
  icon_url: string | null;
  sort_order: number | null;
  default_on: boolean | null;
  default_variant_key: string | null;
};

type ParrotMusicStyleVariantRow = {
  id: string;
  preset_id: string;
  variant_key: string | null;
  title: string | null;
  audio_url: string | null;
  sort_order: number | null;
};

type ParrotMusicStyleSlideRow = {
  id: string;
  style_id: string;
  slide_order: number | null;
  text: string | null;
  media_url: string | null;
  media_type: "gif" | "image" | "video" | null;
};

type ParrotMusicStyleTranslationRow = {
  content_id: string | number | null;
  translation: unknown;
};

type ParrotMusicStyleTranslation = {
  title?: unknown;
  description?: unknown;
  presets?: Array<{
    preset_key?: unknown;
    title?: unknown;
    variants?: Array<{
      variant_key?: unknown;
      title?: unknown;
    }>;
  }>;
  slides?: Array<{
    order?: unknown;
    text?: unknown;
  }>;
};

const SUPPORTED_LANGS = new Set<Lang>(["ru", "en", "he"]);

function normalizeLang(value: string | undefined): Lang {
  return value && SUPPORTED_LANGS.has(value as Lang) ? (value as Lang) : "ru";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeParrotBucketStoragePath(value: string, bucket: "parrot-audio" | "parrot-style-media") {
  const withoutQuery = value.split(/[?#]/, 1)[0] ?? "";
  const normalized = withoutQuery.trim();

  if (!normalized) {
    return "";
  }

  let candidate = normalized;

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      candidate = url.pathname;
    } catch {
      return "";
    }
  }

  candidate = candidate
    .replace(new RegExp(`^/supabase-storage/${bucket}/?`, "i"), "")
    .replace(/^\/supabase-storage\/?/i, "")
    .replace(/^\/+/, "")
    .replace(new RegExp(`^storage/v1/object/public/${bucket}/?`, "i"), "")
    .replace(new RegExp(`^${bucket}/?`, "i"), "");

  if (!candidate) {
    return "";
  }

  return candidate;
}

function resolveParrotAudioUrl(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const isLegacyParrotAudioUrl =
    /\/storage\/v1\/object\/public\/parrot-audio\//i.test(normalized) ||
    /\/supabase-storage\/parrot-audio\//i.test(normalized);

  if (/^https?:\/\//i.test(normalized) && !isLegacyParrotAudioUrl) {
    return normalized;
  }

  const pathInsideBucket = normalizeParrotBucketStoragePath(normalized, "parrot-audio");
  if (!pathInsideBucket) {
    return "";
  }

  return getParrotAudioUrl(pathInsideBucket.startsWith("parrots/") ? pathInsideBucket : `parrots/${pathInsideBucket}`);
}

function resolveParrotStyleMediaUrl(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const isHttpUrl = /^https?:\/\//i.test(normalized);
  const isLegacySupabaseStyleMediaUrl =
    /\/storage\/v1\/object\/public\/parrot-style-media\//i.test(normalized) ||
    /\/supabase-storage\/parrot-style-media\//i.test(normalized);

  if (isHttpUrl && !isLegacySupabaseStyleMediaUrl) {
    return normalized;
  }

  const pathInsideBucket = normalizeParrotBucketStoragePath(normalized, "parrot-style-media");
  return pathInsideBucket ? getParrotStyleMediaUrl(pathInsideBucket) : "";
}

function normalizeOrder(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseTranslation(value: unknown): ParrotMusicStyleTranslation | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return parseTranslation(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? (value as ParrotMusicStyleTranslation)
    : null;
}

function getTranslatedSlideText(
  translation: ParrotMusicStyleTranslation | null,
  fallbackSlide: ParrotMusicStyleSlideRow,
  index: number,
) {
  if (!Array.isArray(translation?.slides)) {
    return normalizeText(fallbackSlide.text);
  }

  const translatedSlides = translation.slides;
  const fallbackOrder = normalizeOrder(fallbackSlide.slide_order);
  const translatedSlide =
    translatedSlides.find((slide) => normalizeOrder(slide.order) === fallbackOrder) ??
    translatedSlides[index];

  return normalizeText(translatedSlide?.text) || normalizeText(fallbackSlide.text);
}

function getTranslatedPreset(
  translation: ParrotMusicStyleTranslation | null,
  presetKey: string,
) {
  return Array.isArray(translation?.presets)
    ? translation.presets.find((preset) => normalizeText(preset.preset_key) === presetKey)
    : null;
}

function getTranslatedVariantTitle(
  translatedPreset: ReturnType<typeof getTranslatedPreset>,
  variantKey: string,
) {
  if (!Array.isArray(translatedPreset?.variants)) {
    return "";
  }

  const translatedVariant = translatedPreset.variants.find(
    (variant) => normalizeText(variant.variant_key) === variantKey,
  );

  return normalizeText(translatedVariant?.title);
}

function mapVariant(
  row: ParrotMusicStyleVariantRow,
  lang: Lang,
  translatedPreset: ReturnType<typeof getTranslatedPreset>,
): ParrotStyleVariant | null {
  const id = normalizeText(row.variant_key) || row.id;
  const src = resolveParrotAudioUrl(row.audio_url);

  if (!id || !src) {
    return null;
  }

  const fallbackLabel = normalizeText(row.title);
  const translatedLabel =
    lang === "ru" ? fallbackLabel : getTranslatedVariantTitle(translatedPreset, id) || fallbackLabel;

  return {
    id,
    src,
    label: translatedLabel ? isolateMixedBidiText(translatedLabel, lang) : undefined,
  };
}

function mapPreset(
  row: ParrotMusicStylePresetRow,
  variants: ParrotMusicStyleVariantRow[],
  lang: Lang,
  translation: ParrotMusicStyleTranslation | null,
): ParrotStyleInstrument | null {
  const presetKey = normalizeText(row.preset_key);
  const label = normalizeText(row.title);

  if (!presetKey || !label) {
    return null;
  }

  const translatedPreset = lang === "ru" ? null : getTranslatedPreset(translation, presetKey);
  const localizedLabel = lang === "ru"
    ? label
    : normalizeText(translatedPreset?.title) || label;

  const mappedVariants = variants
    .map((variant) => mapVariant(variant, lang, translatedPreset))
    .filter((variant): variant is ParrotStyleVariant => Boolean(variant));

  if (mappedVariants.length === 0) {
    return null;
  }

  const defaultIndex = mappedVariants.findIndex(
    (variant) => variant.id === normalizeText(row.default_variant_key),
  );

  return {
    id: presetKey,
    label: isolateMixedBidiText(localizedLabel, lang),
    iconUrl: resolveParrotStyleMediaUrl(row.icon_url) || iconForInstrument(label || presetKey),
    variants: mappedVariants,
    defaultIndex: defaultIndex >= 0 ? defaultIndex : 0,
    defaultOn: Boolean(row.default_on),
  };
}

function mapStyle(
  row: ParrotMusicStyleRow,
  presets: ParrotMusicStylePresetRow[],
  variantsByPresetId: Map<string, ParrotMusicStyleVariantRow[]>,
  slides: ParrotMusicStyleSlideRow[],
  lang: Lang,
  translation: ParrotMusicStyleTranslation | null,
  options?: {
    rawTitles?: boolean;
  },
): ParrotStyleRecord | null {
  const slug = normalizeText(row.slug);
  const fallbackTitle = normalizeText(row.title);
  const fallbackDescription = normalizeText(row.description);

  if (!slug || !fallbackTitle) {
    return null;
  }

  const mappedPresets = presets
    .map((preset) =>
      mapPreset(
        preset,
        variantsByPresetId.get(preset.id) ?? [],
        lang,
        translation,
      ),
    )
    .filter((preset): preset is ParrotStyleInstrument => Boolean(preset));

  if (mappedPresets.length === 0) {
    return null;
  }

  const sortedSlides = slides
    .filter((slide) => normalizeText(slide.text))
    .sort((left, right) => (left.slide_order ?? 0) - (right.slide_order ?? 0));

  const mappedSlides = sortedSlides
    .map((slide, index) => {
      const text = lang === "ru"
        ? normalizeText(slide.text)
        : getTranslatedSlideText(translation, slide, index);

      if (!text) {
        return null;
      }

      const mapped: ParrotStyleSlide = { text };
      const mediaUrl = resolveParrotStyleMediaUrl(slide.media_url);
      if (mediaUrl) {
        mapped.mediaUrl = mediaUrl;
      }
      if (slide.media_type) {
        mapped.mediaType = slide.media_type;
      }
      return mapped;
    })
    .filter((slide): slide is ParrotStyleSlide => Boolean(slide));

  const localizedTitle = options?.rawTitles
    ? fallbackTitle
    : lang === "ru"
      ? fallbackTitle
      : normalizeText(translation?.title) || fallbackTitle;
  const localizedDescription =
    lang === "ru" ? fallbackDescription : normalizeText(translation?.description) || fallbackDescription;

  return {
    id: slug,
    title: isolateMixedBidiText(localizedTitle, lang),
    description: isolateMixedBidiText(localizedDescription, lang),
    iconUrl: normalizeText(row.icon_url) || iconForMusicStyle(slug),
    searchArtist: normalizeText(row.search_artist),
    searchGenre: normalizeText(row.search_genre),
    loops: mappedPresets,
    slides: mappedSlides.map((slide) => ({
      ...slide,
      text: isolateMixedBidiText(slide.text, lang),
    })),
  };
}

export async function loadParrotMusicStylesFromDb(
  langInput: string | undefined,
  options?: {
    rawTitles?: boolean;
  },
): Promise<ParrotStyleRecord[]> {
  const lang = normalizeLang(langInput);

  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { data: styleRows, error: styleError } = await supabase
      .from("parrot_music_styles")
      .select("id, slug, title, description, icon_url, search_artist, search_genre, is_active, sort_order, created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (styleError) {
      throw styleError;
    }

    const styles = (Array.isArray(styleRows) ? styleRows : []) as ParrotMusicStyleRow[];
    const styleIds = styles.map((style) => style.id).filter(Boolean);
    if (styleIds.length === 0) {
      return [];
    }

    const { data: presetRows, error: presetError } = await supabase
      .from("parrot_music_style_presets")
      .select("id, style_id, preset_key, title, icon_url, sort_order, default_on, default_variant_key")
      .in("style_id", styleIds)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (presetError) {
      throw presetError;
    }

    const presets = (Array.isArray(presetRows) ? presetRows : []) as ParrotMusicStylePresetRow[];
    const presetIds = presets.map((preset) => preset.id).filter(Boolean);

    const { data: variantRows, error: variantError } = await supabase
      .from("parrot_music_style_variants")
      .select("id, preset_id, variant_key, title, audio_url, sort_order")
      .in("preset_id", presetIds.length > 0 ? presetIds : ["__none__"])
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (variantError) {
      throw variantError;
    }

    const { data: slideRows, error: slideError } = await supabase
      .from("parrot_music_style_slides")
      .select("id, style_id, slide_order, text, media_url, media_type")
      .in("style_id", styleIds)
      .order("slide_order", { ascending: true });

    if (slideError) {
      throw slideError;
    }

    const translationsByContentId = new Map<string, ParrotMusicStyleTranslation>();
    if (lang !== "ru") {
      const { data: translationRows, error: translationError } = await supabase
        .from("content_translations")
        .select("content_id, translation")
        .eq("content_type", "parrot_music_style")
        .eq("language", lang)
        .in("content_id", styleIds);

      if (translationError) {
        throw translationError;
      }

      for (const row of (translationRows || []) as ParrotMusicStyleTranslationRow[]) {
        const contentId = row.content_id == null ? "" : String(row.content_id);
        const translation = parseTranslation(row.translation);
        if (contentId && translation) {
          translationsByContentId.set(contentId, translation);
        }
      }
    }

    const presetsByStyleId = new Map<string, ParrotMusicStylePresetRow[]>();
    for (const preset of presets) {
      const items = presetsByStyleId.get(preset.style_id) ?? [];
      items.push(preset);
      presetsByStyleId.set(preset.style_id, items);
    }

    const variantsByPresetId = new Map<string, ParrotMusicStyleVariantRow[]>();
    for (const variant of (variantRows || []) as ParrotMusicStyleVariantRow[]) {
      const items = variantsByPresetId.get(variant.preset_id) ?? [];
      items.push(variant);
      variantsByPresetId.set(variant.preset_id, items);
    }

    const slidesByStyleId = new Map<string, ParrotMusicStyleSlideRow[]>();
    for (const slide of (slideRows || []) as ParrotMusicStyleSlideRow[]) {
      const items = slidesByStyleId.get(slide.style_id) ?? [];
      items.push(slide);
      slidesByStyleId.set(slide.style_id, items);
    }

    return styles
      .map((style) => mapStyle(
        style,
        presetsByStyleId.get(style.id) ?? [],
        variantsByPresetId,
        slidesByStyleId.get(style.id) ?? [],
        lang,
        translationsByContentId.get(style.id) ?? null,
        options,
      ))
      .filter((style): style is ParrotStyleRecord => Boolean(style));
  } catch (error) {
    console.warn("[parrot-music-styles] failed to load Supabase styles; using hardcoded fallback", error);
    return [];
  }
}

export async function loadCombinedParrotMusicStyles(
  langInput: string | undefined,
  options?: {
    rawTitles?: boolean;
  },
): Promise<ParrotStyleRecord[]> {
  const lang = normalizeLang(langInput);
  const dbStyles = await loadParrotMusicStylesFromDb(lang, options);
  const fallbackStyles = getHardcodedParrotStyleRecords(lang);
  const byId = new Map<string, ParrotStyleRecord>();

  for (const style of fallbackStyles) {
    byId.set(style.id, style);
  }

  for (const style of dbStyles) {
    byId.set(style.id, style);
  }

  return Array.from(byId.values());
}
