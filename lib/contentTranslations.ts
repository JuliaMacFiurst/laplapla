import { supabase } from "@/lib/supabase/client";

export type ContentType = "lesson" | "map_story" | "artwork";

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

type ContentByType = {
  lesson: LessonContent;
  map_story: MapStoryContent;
  artwork: ArtworkContent;
};

type TranslationPayload = {
  title?: string;
  content?: string;
  description?: string;
  steps_frank?: string[];
};

const BASE_TABLES: Record<ContentType, string> = {
  lesson: "lessons",
  map_story: "map_stories",
  artwork: "artworks",
};

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
    default:
      return base;
  }
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

  const { data: translationRow, error: translationError } = await supabase
    .from("content_translations")
    .select("translation")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .eq("language", lang)
    .maybeSingle();

  if (translationError) {
    throw translationError;
  }

  if (!translationRow?.translation) {
    return {
      content: baseContent as ContentByType[T],
      translated: false,
    };
  }

  return {
    content: applyTranslation(
      contentType,
      baseContent as ContentByType[T],
      translationRow.translation as TranslationPayload,
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
