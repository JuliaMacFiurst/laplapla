import { supabase } from "@/lib/supabase/client";

export type ContentType =
  | "lesson"
  | "map_story"
  | "artwork"
  | "book"
  | "story_template"
  | "story_submission"
  | "cat_preset";

type LessonStep = {
  frank?: string;
  image?: string;
  [key: string]: unknown;
};

type LessonContent = {
  id: string | number;
  title?: string;
  preview?: string;
  slug?: string;
  category_slug?: string;
  steps?: LessonStep[];
  [key: string]: unknown;
};

type MapStoryContent = {
  id: string | number;
  content?: string | null;
  [key: string]: unknown;
};

type ArtworkContent = {
  id: string | number;
  title?: string;
  description?: string;
  image_url?: string[] | string;
  category_slug?: string;
  [key: string]: unknown;
};

type BookContent = {
  id: string | number;
  title?: string;
  author?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

type StoryTemplateContent = {
  id: string | number;
  title?: string;
  hero_name?: string;
  hero?: string;
  [key: string]: unknown;
};

type StorySubmissionContent = {
  id: string | number;
  hero_name?: string;
  assembled_story?: unknown;
  [key: string]: unknown;
};

type CatPresetContent = {
  id: string | number;
  prompt?: string;
  [key: string]: unknown;
};

type ContentByType = {
  lesson: LessonContent;
  map_story: MapStoryContent;
  artwork: ArtworkContent;
  book: BookContent;
  story_template: StoryTemplateContent;
  story_submission: StorySubmissionContent;
  cat_preset: CatPresetContent;
};

export type TranslationPayload = {
  title?: string;
  prompt?: string;
  content?: string;
  description?: string;
  author?: string;
  hero_name?: string;
  assembled_story?: unknown;
  steps_frank?: string[];
  slides?: Array<{
    text?: string;
    [key: string]: unknown;
  }>;
  sections?: Array<{
    mode_slug?: string;
    mode_name?: string;
    slug?: string;
    title?: string;
    name?: string;
    slides?: Array<{
      text?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  tests?: Array<{
    title?: string;
    description?: string;
    questions?: Array<{
      question?: string;
      answers?: Array<{
        text?: string;
        correct?: boolean;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

const BASE_TABLES: Record<ContentType, string> = {
  lesson: "lessons",
  map_story: "map_stories",
  artwork: "artworks",
  book: "books",
  story_template: "story_templates",
  story_submission: "user_story_submissions",
  cat_preset: "cat_presets",
};

const getTranslationsClient = () => supabase;

const normalizeContentIds = (contentIds: Array<string | number>) =>
  Array.from(new Set(contentIds.map((contentId) => String(contentId).trim()).filter(Boolean)));

function parseTranslationPayload(value: unknown): TranslationPayload | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as TranslationPayload
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? value as TranslationPayload
    : null;
}

function applyLessonTranslation(base: LessonContent, translation: TranslationPayload): LessonContent {
  const translatedSteps = Array.isArray(base.steps)
    ? base.steps.map((step, index) => ({
        ...step,
        frank: translation.steps_frank?.[index] ?? step.frank,
      }))
    : base.steps;

  return {
    ...base,
    title: translation.title ?? base.title,
    steps: translatedSteps,
  };
}

function applyMapStoryTranslation(
  base: MapStoryContent,
  translation: TranslationPayload,
): MapStoryContent {
  return {
    ...base,
    content: translation.content ?? base.content,
  };
}

function applyArtworkTranslation(
  base: ArtworkContent,
  translation: TranslationPayload,
): ArtworkContent {
  return {
    ...base,
    title: translation.title ?? base.title,
    description: translation.description ?? base.description,
  };
}

function applyBookTranslation(
  base: BookContent,
  translation: TranslationPayload,
): BookContent {
  return {
    ...base,
    title: translation.title ?? base.title,
    author: translation.author ?? base.author,
    description: translation.description ?? base.description,
  };
}

function applyStoryTemplateTranslation(
  base: StoryTemplateContent,
  translation: TranslationPayload,
): StoryTemplateContent {
  return {
    ...base,
    title: translation.title ?? base.title,
    hero_name: translation.hero_name ?? base.hero_name,
    hero: translation.hero_name ?? base.hero,
  };
}

function applyStorySubmissionTranslation(
  base: StorySubmissionContent,
  translation: TranslationPayload,
): StorySubmissionContent {
  return {
    ...base,
    hero_name: translation.hero_name ?? base.hero_name,
    assembled_story: translation.assembled_story ?? base.assembled_story,
  };
}

function applyCatPresetTranslation(
  base: CatPresetContent,
  translation: TranslationPayload,
): CatPresetContent {
  return {
    ...base,
    prompt: translation.prompt ?? base.prompt,
  };
}

function applyTranslation<T extends ContentType>(
  contentType: T,
  base: ContentByType[T],
  translation: TranslationPayload,
): ContentByType[T] {
  switch (contentType) {
    case "lesson":
      return applyLessonTranslation(base as LessonContent, translation) as ContentByType[T];
    case "map_story":
      return applyMapStoryTranslation(base as MapStoryContent, translation) as ContentByType[T];
    case "artwork":
      return applyArtworkTranslation(base as ArtworkContent, translation) as ContentByType[T];
    case "book":
      return applyBookTranslation(base as BookContent, translation) as ContentByType[T];
    case "story_template":
      return applyStoryTemplateTranslation(base as StoryTemplateContent, translation) as ContentByType[T];
    case "story_submission":
      return applyStorySubmissionTranslation(base as StorySubmissionContent, translation) as ContentByType[T];
    case "cat_preset":
      return applyCatPresetTranslation(base as CatPresetContent, translation) as ContentByType[T];
    default:
      return base;
  }
}

export async function getTranslationPayload<T extends ContentType>(
  contentType: T,
  contentId: string | number,
  lang: string,
): Promise<TranslationPayload | null> {
  return getTranslationPayloadByContentIds(contentType, [contentId], lang);
}

export async function getTranslationPayloadByContentIds<T extends ContentType>(
  contentType: T,
  contentIds: Array<string | number>,
  lang: string,
): Promise<TranslationPayload | null> {
  if (!lang || lang === "ru") {
    return null;
  }

  const normalizedIds = normalizeContentIds(contentIds);
  if (normalizedIds.length === 0) {
    return null;
  }

  const { data: translationRows, error: translationError } = await getTranslationsClient()
    .from("content_translations")
    .select("content_id, translation")
    .eq("content_type", contentType)
    .eq("language", lang)
    .in("content_id", normalizedIds);

  if (translationError) {
    throw translationError;
  }

  const matchedRow = normalizedIds
    .map((contentId) => (translationRows || []).find((row) => String(row.content_id) === contentId))
    .find(Boolean);

  return parseTranslationPayload(matchedRow?.translation);
}

export async function getTranslationPayloadMap<T extends ContentType>(
  contentType: T,
  contentIds: Array<string | number>,
  lang: string,
): Promise<Map<string, TranslationPayload>> {
  const uniqueIds = normalizeContentIds(contentIds);
  if (!lang || lang === "ru" || uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await getTranslationsClient()
    .from("content_translations")
    .select("content_id, translation")
    .eq("content_type", contentType)
    .eq("language", lang)
    .in("content_id", uniqueIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data || [])
      .map((row) => [String(row.content_id), parseTranslationPayload(row.translation)] as const)
      .filter((entry): entry is [string, TranslationPayload] => Boolean(entry[1])),
  );
}

export async function getTranslatedContent<T extends ContentType>(
  contentType: T,
  contentId: string | number,
  lang: string,
): Promise<{ content: ContentByType[T]; translated: boolean }> {
  const { data: baseContent, error: baseError } = await supabase
    .from(BASE_TABLES[contentType])
    .select("*")
    .eq("id", contentId)
    .single();

  if (baseError || !baseContent) {
    throw baseError ?? new Error(`Base ${contentType} not found`);
  }

  if (!lang || lang === "ru") {
    return {
      content: baseContent as ContentByType[T],
      translated: true,
    };
  }

  const translation = await getTranslationPayload(contentType, contentId, lang);

  if (!translation) {
    return {
      content: baseContent as ContentByType[T],
      translated: false,
    };
  }

  return {
    content: applyTranslation(
      contentType,
      baseContent as ContentByType[T],
      translation,
    ),
    translated: true,
  };
}

export async function getTranslatedContents<T extends ContentType>(
  contentType: T,
  contentIds: Array<string | number>,
  lang: string,
): Promise<Array<{ content: ContentByType[T]; translated: boolean }>> {
  return Promise.all(contentIds.map((contentId) => getTranslatedContent(contentType, contentId, lang)));
}
