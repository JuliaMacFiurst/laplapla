import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { MapPopupSlide } from "@/types/mapPopup";

type PersistSlidesResponse =
  | {
      slides: MapPopupSlide[];
      skipped?: boolean;
    }
  | { error: string };

function buildSlides(rows: Array<{
  id?: string | number | null;
  slide_order?: number | null;
  text?: string | null;
  image_url?: string | null;
  image_credit_line?: string | null;
}>): MapPopupSlide[] {
  return rows.map((row, index) => ({
    id: String(row.id ?? `generated:${index}`),
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PersistSlidesResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { storyId, slides } = req.body ?? {};
  const normalizedStoryId =
    typeof storyId === "number"
      ? storyId
      : typeof storyId === "string" && storyId.trim()
        ? (/^\d+$/.test(storyId.trim()) ? Number(storyId.trim()) : storyId.trim())
        : null;

  if (normalizedStoryId === null) {
    return res.status(400).json({ error: "Invalid or missing storyId" });
  }

  if (!Array.isArray(slides) || slides.length === 0) {
    return res.status(400).json({ error: "Invalid or missing slides" });
  }

  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { data: existing, error: existingError } = await supabase
      .from("map_story_slides")
      .select("id, slide_order, text, image_url, image_credit_line")
      .eq("story_id", normalizedStoryId)
      .order("slide_order", { ascending: true });

    if (existingError) {
      throw existingError;
    }

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(200).json({
        slides: buildSlides(existing),
        skipped: true,
      });
    }

    const insertPayload = slides
      .map((slide: any, index: number) => ({
        story_id: normalizedStoryId,
        slide_order: typeof slide?.slideOrder === "number" ? slide.slideOrder : index,
        text: typeof slide?.text === "string" ? slide.text.trim() : "",
      }))
      .filter((slide) => slide.text.length > 0);

    if (insertPayload.length === 0) {
      return res.status(400).json({ error: "No valid slides to persist" });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("map_story_slides")
      .insert(insertPayload)
      .select("id, slide_order, text, image_url, image_credit_line")
      .order("slide_order", { ascending: true });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({
      slides: buildSlides(Array.isArray(inserted) ? inserted : []),
    });
  } catch (error) {
    console.error("[/api/map-popup-slides/persist] failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
