import { createClient } from "@supabase/supabase-js";
import type { MapPopupContent, MapPopupSlide, MapPopupType } from "@/types/mapPopup";

type MapStoryRow = {
  id: string | number;
  type: MapPopupType;
  target_id: string;
  language: string;
  content?: string | null;
  images?: string[] | null;
  audio_url?: string | null;
  google_maps_url?: string | null;
  youtube_url_ru?: string | null;
  youtube_url_he?: string | null;
  youtube_url_en?: string | null;
};

type MapStorySlideRow = {
  id?: string | number | null;
  story_id?: string | number | null;
  slide_order?: number | null;
  text?: string | null;
  image_url?: string | null;
  image_credit_line?: string | null;
};

type GetMapPopupContentParams = {
  type: MapPopupType;
  targetId: string;
  lang?: string;
};

function getServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server env is not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function extractYouTubeId(url: string | null | undefined): string | null {
  const value = typeof url === "string" ? url.trim() : "";
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        return parts[1] || null;
      }
    }
  } catch {
    // Fall through to regex parsing for legacy / malformed URLs.
  }

  const match = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&?/]+)/i);

  return match?.[1] || null;
}

function pickYoutubeUrl(story: MapStoryRow, lang: string): string | null {
  const orderedKeys =
    lang === "he"
      ? ["youtube_url_he", "youtube_url_en", "youtube_url_ru"]
      : lang === "en"
        ? ["youtube_url_en", "youtube_url_ru", "youtube_url_he"]
        : ["youtube_url_ru", "youtube_url_en", "youtube_url_he"];

  for (const key of orderedKeys) {
    const candidate = story[key as keyof MapStoryRow];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

async function loadStory(type: MapPopupType, targetId: string, lang: string): Promise<MapStoryRow | null> {
  const supabase = getServerSupabaseClient();
  const commaSeparatedSegments = targetId
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const targetIdCandidates = Array.from(
    new Set(
      [
        targetId,
        ...commaSeparatedSegments,
      ].filter(Boolean),
    ),
  );

  const loadByLanguage = async (language: string) => {
    for (const candidateTargetId of targetIdCandidates) {
      const { data, error } = await supabase
        .from("map_stories")
        .select(
          "id, type, target_id, language, content, images, audio_url, google_maps_url, youtube_url_ru, youtube_url_he, youtube_url_en",
        )
        .eq("type", type)
        .eq("target_id", candidateTargetId)
        .eq("language", language)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        return data as MapStoryRow;
      }
    }

    for (const candidateTargetId of targetIdCandidates) {
      const { data, error } = await supabase
        .from("map_stories")
        .select(
          "id, type, target_id, language, content, images, audio_url, google_maps_url, youtube_url_ru, youtube_url_he, youtube_url_en",
        )
        .eq("type", type)
        .eq("language", language)
        .ilike("target_id", `${candidateTargetId}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        return data as MapStoryRow;
      }
    }

    for (const candidateTargetId of targetIdCandidates.filter((candidate) => candidate.length >= 4)) {
      const { data, error } = await supabase
        .from("map_stories")
        .select(
          "id, type, target_id, language, content, images, audio_url, google_maps_url, youtube_url_ru, youtube_url_he, youtube_url_en",
        )
        .eq("type", type)
        .eq("language", language)
        .ilike("target_id", `%${candidateTargetId}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        return data as MapStoryRow;
      }
    }

    return null;
  };

  const directMatch = await loadByLanguage(lang);
  if (directMatch) {
    return directMatch;
  }

  if (lang !== "ru") {
    return loadByLanguage("ru");
  }

  return null;
}

async function loadStorySlides(storyId: string | number): Promise<MapStorySlideRow[]> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("map_story_slides")
    .select("id, story_id, slide_order, text, image_url, image_credit_line")
    .eq("story_id", storyId)
    .order("slide_order", { ascending: true });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data as MapStorySlideRow[] : [];
}

function buildSlidesFromRows(story: MapStoryRow, slideRows: MapStorySlideRow[]): MapPopupSlide[] {
  const slideIdBase = `${story.type}:${story.target_id}`;

  return slideRows.map((row, index) => ({
    id: String(row.id ?? `${slideIdBase}:${index}`),
    index: typeof row.slide_order === "number" ? row.slide_order : index,
    text: typeof row.text === "string" ? row.text.trim() : "",
    imageUrl: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url.trim() : null,
    imageCreditLine:
      typeof row.image_credit_line === "string" && row.image_credit_line.trim()
        ? row.image_credit_line.trim()
        : null,
    imageAuthor: null,
    imageSourceUrl: null,
  }));
}

export async function getMapPopupContent({
  type,
  targetId,
  lang = "ru",
}: GetMapPopupContentParams): Promise<MapPopupContent | null> {
  console.log(`[map-popup-content] loading type=${type} targetId=${targetId} lang=${lang}`);

  const baseStory = await loadStory(type, targetId, lang);
  if (!baseStory) {
    console.log(`[map-popup-content] no story found for type=${type} targetId=${targetId}`);
    return null;
  }

  const slideRows = await loadStorySlides(baseStory.id);
  const slides = buildSlidesFromRows(baseStory, slideRows);

  const payload: MapPopupContent = {
    storyId: baseStory.id,
    type,
    targetId,
    lang: baseStory.language || lang,
    rawContent: typeof baseStory.content === "string" && baseStory.content.trim() ? baseStory.content.trim() : null,
    title: null,
    googleMapsUrl:
      typeof baseStory.google_maps_url === "string" && baseStory.google_maps_url.trim()
        ? baseStory.google_maps_url.trim()
        : null,
    slides,
    video: (() => {
      const youtubeUrl = pickYoutubeUrl(baseStory, lang);
      const youtubeId = extractYouTubeId(youtubeUrl);

      if (!youtubeUrl && !youtubeId) {
        return null;
      }

      return {
        youtubeUrl,
        youtubeId,
        title: null,
      };
    })(),
    source: "map_story_slides",
  };

  console.log(
    `[map-popup-content] loaded type=${type} targetId=${targetId} lang=${lang} slides=${slides.length}`,
  );

  return payload;
}
