import { parseMapStoryContentToSlides } from "@/lib/mapPopup/slideParser";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type PersistableStory = {
  id: string | number;
  content?: string | null;
};

type PersistedSlideRow = {
  id?: string | number | null;
  story_id?: string | number | null;
  slide_order?: number | null;
  text?: string | null;
  image_url?: string | null;
  image_credit_line?: string | null;
};

type PersistedStoryRow = {
  id: string | number;
  content?: string | null;
};

type PersistResolvedSlideMediaParams = {
  storyId: string | number;
  slideId?: string | null;
  slideOrder?: number | null;
  slideText?: string | null;
  imageUrl: string;
  imageCreditLine?: string | null;
};

function normalizeSlideText(value: string | null | undefined) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function normalizeSlideRows(data: unknown): PersistedSlideRow[] {
  return Array.isArray(data) ? (data as PersistedSlideRow[]) : [];
}

async function loadPersistedSlides(storyId: string | number) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("map_story_slides")
    .select("id, story_id, slide_order, text, image_url, image_credit_line")
    .eq("story_id", storyId)
    .order("slide_order", { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeSlideRows(data);
}

async function loadStoryForPersistence(storyId: string | number): Promise<PersistedStoryRow | null> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("map_stories")
    .select("id, content")
    .eq("id", storyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PersistedStoryRow | null) ?? null;
}

export async function ensurePersistedStorySlides(story: PersistableStory) {
  const content = typeof story.content === "string" ? story.content.trim() : "";
  if (!content) {
    return [] as PersistedSlideRow[];
  }

  const existingSlides = await loadPersistedSlides(story.id);
  if (existingSlides.length > 0) {
    return existingSlides;
  }

  const parsedSlides = parseMapStoryContentToSlides(content)
    .map((slide, index) => ({
      story_id: story.id,
      slide_order: typeof slide.slideOrder === "number" ? slide.slideOrder : index,
      text: slide.text.trim(),
      image_url: null,
      image_credit_line: null,
    }))
    .filter((slide) => slide.text.length > 0);

  if (parsedSlides.length === 0) {
    return [];
  }

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { error: insertError } = await supabase
    .from("map_story_slides")
    .insert(parsedSlides);

  if (insertError) {
    throw insertError;
  }

  await supabase
    .from("map_stories")
    .update({
      slides_ready: true,
      content_mode: "slides",
      updated_at: new Date().toISOString(),
    })
    .eq("id", story.id);

  return loadPersistedSlides(story.id);
}

export async function ensurePersistedSlidesByStoryId(storyId: string | number) {
  const story = await loadStoryForPersistence(storyId);
  if (!story) {
    return [] as PersistedSlideRow[];
  }

  return ensurePersistedStorySlides(story);
}

export async function persistResolvedSlideMedia({
  storyId,
  slideId,
  slideOrder,
  slideText,
  imageUrl,
  imageCreditLine,
}: PersistResolvedSlideMediaParams) {
  const supabase = createServerSupabaseClient({ serviceRole: true });

  const normalizedImageUrl = imageUrl.trim();
  const normalizedCreditLine = typeof imageCreditLine === "string" && imageCreditLine.trim()
    ? imageCreditLine.trim()
    : null;
  const normalizedSlideText = normalizeSlideText(slideText);

  const resolveTargetSlideId = async () => {
    if (slideId && !slideId.startsWith("parsed:")) {
      const { data, error } = await supabase
        .from("map_story_slides")
        .select("id")
        .eq("id", slideId)
        .eq("story_id", storyId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.id) {
        return data.id;
      }
    }

    if (typeof slideOrder === "number") {
      const { data, error } = await supabase
        .from("map_story_slides")
        .select("id")
        .eq("story_id", storyId)
        .eq("slide_order", slideOrder)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.id) {
        return data.id;
      }
    }

    if (normalizedSlideText) {
      const slides = await loadPersistedSlides(storyId);
      const matchedSlide = slides.find((slide) => normalizeSlideText(slide.text) === normalizedSlideText);
      if (matchedSlide?.id) {
        return matchedSlide.id;
      }
    }

    return null;
  };

  let targetSlideId = await resolveTargetSlideId();
  if (!targetSlideId) {
    await ensurePersistedSlidesByStoryId(storyId);
    targetSlideId = await resolveTargetSlideId();
  }

  if (!targetSlideId) {
    return null;
  }

  const { data, error } = await supabase
    .from("map_story_slides")
    .update({
      image_url: normalizedImageUrl,
      image_credit_line: normalizedCreditLine,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetSlideId)
    .eq("story_id", storyId)
    .select("id, story_id, slide_order, text, image_url, image_credit_line")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PersistedSlideRow | null;
}
