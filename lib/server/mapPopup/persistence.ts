import { parseMapStoryContentToSlides } from "@/lib/mapPopup/slideParser";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type PersistableStory = {
  id: string | number;
  target_id?: string | null;
  content?: string | null;
};

type PersistedSlideRow = {
  id?: string | number | null;
  story_id?: string | number | null;
  slide_order?: number | null;
  text?: string | null;
  image_url?: string | null;
  image_credit_line?: string | null;
  updated_at?: string | null;
};

type PersistedStoryRow = {
  id: string | number;
  target_id?: string | null;
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

type ResolvedSlideMatch = {
  slideId: string | number | null;
  matchSource: "id" | "order" | "text" | "none";
  matchedRow: PersistedSlideRow | null;
};

export type PersistResolvedSlideMediaResult = {
  slide: PersistedSlideRow | null;
  reason: "updated" | "slide_not_found" | "update_returned_empty" | "verification_failed";
  writeState: "saved" | "updated" | null;
  matchSource: ResolvedSlideMatch["matchSource"];
};

function normalizeSlideText(value: string | null | undefined) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function extractSlideOrderFromSlideId(slideId: string | null | undefined) {
  if (!slideId) {
    return null;
  }

  const match = slideId.match(/:(\d+)$/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSlideRows(data: unknown): PersistedSlideRow[] {
  return Array.isArray(data) ? (data as PersistedSlideRow[]) : [];
}

function pickPreferredSlideRow(current: PersistedSlideRow | undefined, candidate: PersistedSlideRow) {
  if (!current) {
    return candidate;
  }

  const currentHasImage = typeof current.image_url === "string" && current.image_url.trim().length > 0;
  const candidateHasImage = typeof candidate.image_url === "string" && candidate.image_url.trim().length > 0;

  if (candidateHasImage && !currentHasImage) {
    return candidate;
  }

  if (candidateHasImage === currentHasImage) {
    const currentUpdatedAt = typeof current.updated_at === "string" ? current.updated_at : "";
    const candidateUpdatedAt = typeof candidate.updated_at === "string" ? candidate.updated_at : "";
    if (candidateUpdatedAt > currentUpdatedAt) {
      return candidate;
    }
  }

  return current;
}

function dedupeSlideRows(rows: PersistedSlideRow[]) {
  const byKey = new Map<string, PersistedSlideRow>();

  for (const row of rows) {
    const key =
      typeof row.slide_order === "number"
        ? `order:${row.slide_order}`
        : `id:${String(row.id ?? "")}`;
    byKey.set(key, pickPreferredSlideRow(byKey.get(key), row));
  }

  return Array.from(byKey.values()).sort((left, right) => {
    const leftOrder = typeof left.slide_order === "number" ? left.slide_order : Number.MAX_SAFE_INTEGER;
    const rightOrder = typeof right.slide_order === "number" ? right.slide_order : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

function resolveSlideIdFromRows(
  rows: PersistedSlideRow[],
  {
    slideId,
    slideOrder,
    slideText,
  }: {
    slideId?: string | null;
    slideOrder?: number | null;
    slideText?: string | null;
  },
) {
  const inferredSlideOrder =
    typeof slideOrder === "number"
      ? slideOrder
      : extractSlideOrderFromSlideId(slideId);

  if (slideId && !slideId.startsWith("parsed:")) {
    const byId = rows.find((row) => String(row.id) === slideId);
    if (byId?.id) {
      return {
        slideId: byId.id,
        matchSource: "id",
        matchedRow: byId,
      } satisfies ResolvedSlideMatch;
    }
  }

  if (typeof inferredSlideOrder === "number") {
    const byOrder = rows.find((row) => row.slide_order === inferredSlideOrder);
    if (byOrder?.id) {
      return {
        slideId: byOrder.id,
        matchSource: "order",
        matchedRow: byOrder,
      } satisfies ResolvedSlideMatch;
    }
  }

  const normalizedSlideText = normalizeSlideText(slideText);
  if (normalizedSlideText) {
    const byText = rows.find((row) => normalizeSlideText(row.text) === normalizedSlideText);
    if (byText?.id) {
      return {
        slideId: byText.id,
        matchSource: "text",
        matchedRow: byText,
      } satisfies ResolvedSlideMatch;
    }
  }

  return {
    slideId: null,
    matchSource: "none",
    matchedRow: null,
  } satisfies ResolvedSlideMatch;
}

function buildParsedSlideRows(story: PersistableStory) {
  const content = typeof story.content === "string" ? story.content.trim() : "";
  if (!content) {
    return [] as PersistedSlideRow[];
  }

  return parseMapStoryContentToSlides(content)
    .map((slide, index) => ({
      id: `parsed:${story.id}:${typeof slide.slideOrder === "number" ? slide.slideOrder : index}`,
      story_id: story.id,
      slide_order: typeof slide.slideOrder === "number" ? slide.slideOrder : index,
      text: slide.text.trim(),
      image_url: null,
      image_credit_line: null,
    }))
    .filter((slide) => typeof slide.text === "string" && slide.text.length > 0);
}

function createPersistenceClient(serviceRole = false) {
  return createServerSupabaseClient(serviceRole ? { serviceRole: true } : undefined);
}

async function loadPersistedSlides(storyId: string | number, options?: { serviceRole?: boolean }) {
  const supabase = createPersistenceClient(options?.serviceRole);
  const { data, error } = await supabase
    .from("map_story_slides")
    .select("id, story_id, slide_order, text, image_url, image_credit_line, updated_at")
    .eq("story_id", storyId)
    .order("slide_order", { ascending: true });

  if (error) {
    throw error;
  }

  return dedupeSlideRows(normalizeSlideRows(data));
}

async function loadPersistedSlideById(
  storyId: string | number,
  slideId: string | number,
  options?: { serviceRole?: boolean },
) {
  const supabase = createPersistenceClient(options?.serviceRole);
  const { data, error } = await supabase
    .from("map_story_slides")
    .select("id, story_id, slide_order, text, image_url, image_credit_line, updated_at")
    .eq("story_id", storyId)
    .eq("id", slideId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PersistedSlideRow | null) ?? null;
}

async function loadPersistedSlideByOrder(
  storyId: string | number,
  slideOrder: number,
  options?: { serviceRole?: boolean },
) {
  const supabase = createPersistenceClient(options?.serviceRole);
  const { data, error } = await supabase
    .from("map_story_slides")
    .select("id, story_id, slide_order, text, image_url, image_credit_line, updated_at")
    .eq("story_id", storyId)
    .eq("slide_order", slideOrder)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return dedupeSlideRows(normalizeSlideRows(data))[0] ?? null;
}

async function loadStoryForPersistence(
  storyId: string | number,
  options?: { serviceRole?: boolean },
): Promise<PersistedStoryRow | null> {
  const supabase = createPersistenceClient(options?.serviceRole);
  const { data, error } = await supabase
    .from("map_stories")
    .select("id, target_id, content")
    .eq("id", storyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PersistedStoryRow | null) ?? null;
}

export async function loadStoryPersistenceTarget(storyId: string | number) {
  return loadStoryForPersistence(storyId);
}

export function generateStorySlides(story: PersistableStory) {
  return buildParsedSlideRows(story);
}

export async function resolveStorySlides(storyId: string | number) {
  const existingSlides = await loadPersistedSlides(storyId);
  if (existingSlides.length > 0) {
    return existingSlides;
  }

  const story = await loadStoryForPersistence(storyId);
  if (!story) {
    return [] as PersistedSlideRow[];
  }

  return buildParsedSlideRows(story);
}

export async function ensurePersistedStorySlides(story: PersistableStory, options?: { serviceRole?: boolean }) {
  const parsedSlides = buildParsedSlideRows(story);
  if (parsedSlides.length === 0) {
    return [] as PersistedSlideRow[];
  }

  const existingSlides = await loadPersistedSlides(story.id, options);
  if (existingSlides.length > 0) {
    return existingSlides;
  }

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { error: insertError } = await supabase
    .from("map_story_slides")
    .insert(
      parsedSlides.map((slide) => ({
        story_id: slide.story_id,
        slide_order: slide.slide_order,
        text: slide.text,
        image_url: slide.image_url,
        image_credit_line: slide.image_credit_line,
      })),
    );

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

  return loadPersistedSlides(story.id, { serviceRole: true });
}

export async function ensurePersistedSlidesByStoryId(storyId: string | number) {
  const story = await loadStoryForPersistence(storyId, { serviceRole: true });
  if (!story) {
    return [] as PersistedSlideRow[];
  }

  return ensurePersistedStorySlides(story, { serviceRole: true });
}

export async function persistResolvedSlideMediaWithStatus({
  storyId,
  slideId,
  slideOrder,
  slideText,
  imageUrl,
  imageCreditLine,
}: PersistResolvedSlideMediaParams) {
  const normalizedImageUrl = imageUrl.trim();
  const normalizedCreditLine = typeof imageCreditLine === "string" && imageCreditLine.trim()
    ? imageCreditLine.trim()
    : null;

  let slides = await loadPersistedSlides(storyId, { serviceRole: true });
  let resolvedMatch = resolveSlideIdFromRows(slides, {
    slideId,
    slideOrder,
    slideText,
  });

  if (!resolvedMatch.slideId) {
    slides = await ensurePersistedSlidesByStoryId(storyId);
    resolvedMatch = resolveSlideIdFromRows(slides, {
      slideId,
      slideOrder,
      slideText,
    });
  }

  if (!resolvedMatch.slideId) {
    return {
      slide: null,
      reason: "slide_not_found",
      writeState: null,
      matchSource: resolvedMatch.matchSource,
    } satisfies PersistResolvedSlideMediaResult;
  }

  const previousImageUrl =
    typeof resolvedMatch.matchedRow?.image_url === "string" && resolvedMatch.matchedRow.image_url.trim()
      ? resolvedMatch.matchedRow.image_url.trim()
      : "";

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const updatePayload = {
    image_url: normalizedImageUrl,
    image_credit_line: normalizedCreditLine,
    updated_at: new Date().toISOString(),
  };
  const targetSlideOrder =
    typeof resolvedMatch.matchedRow?.slide_order === "number"
      ? resolvedMatch.matchedRow.slide_order
      : null;
  const updateQuery = targetSlideOrder != null
    ? supabase
        .from("map_story_slides")
        .update(updatePayload)
        .eq("story_id", storyId)
        .eq("slide_order", targetSlideOrder)
        .select("id, story_id, slide_order, text, image_url, image_credit_line, updated_at")
    : supabase
        .from("map_story_slides")
        .update(updatePayload)
        .eq("id", resolvedMatch.slideId)
        .eq("story_id", storyId)
        .select("id, story_id, slide_order, text, image_url, image_credit_line, updated_at");

  const { data, error } = await updateQuery;

  if (error) {
    throw error;
  }

  const updatedSlides = dedupeSlideRows(normalizeSlideRows(data));
  const slide = updatedSlides[0] ?? null;
  const verifiedSlide =
    targetSlideOrder != null
      ? await loadPersistedSlideByOrder(storyId, targetSlideOrder, { serviceRole: true })
      : slide
        ? await loadPersistedSlideById(storyId, resolvedMatch.slideId, { serviceRole: true })
        : null;
  const verifiedImageUrl =
    typeof verifiedSlide?.image_url === "string" ? verifiedSlide.image_url.trim() : "";
  const verificationPassed = Boolean(
    verifiedSlide &&
    verifiedImageUrl &&
    verifiedImageUrl === normalizedImageUrl,
  );

  return {
    slide: verificationPassed ? verifiedSlide : null,
    reason: slide
      ? verificationPassed
        ? "updated"
        : "verification_failed"
      : "update_returned_empty",
    writeState: verificationPassed ? (previousImageUrl ? "updated" : "saved") : null,
    matchSource: resolvedMatch.matchSource,
  } satisfies PersistResolvedSlideMediaResult;
}

export async function persistResolvedSlideMedia(params: PersistResolvedSlideMediaParams) {
  const result = await persistResolvedSlideMediaWithStatus(params);
  return result.slide;
}

export async function buildResolvedSlideMediaPreview({
  storyId,
  slideId,
  slideOrder,
  slideText,
  imageUrl,
  imageCreditLine,
}: PersistResolvedSlideMediaParams) {
  const slides = await resolveStorySlides(storyId);
  const targetSlide = slides.find((slide) => {
    if (slideId && String(slide.id) === slideId) {
      return true;
    }

    if (typeof slideOrder === "number" && slide.slide_order === slideOrder) {
      return true;
    }

    return normalizeSlideText(slide.text) === normalizeSlideText(slideText);
  });

  if (!targetSlide) {
    return null;
  }

  return {
    ...targetSlide,
    image_url: imageUrl.trim(),
    image_credit_line:
      typeof imageCreditLine === "string" && imageCreditLine.trim()
        ? imageCreditLine.trim()
        : null,
  };
}
