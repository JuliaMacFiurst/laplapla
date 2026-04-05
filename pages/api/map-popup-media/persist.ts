import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type PersistResponse =
  | {
      slide: {
        id: string;
        imageUrl: string | null;
        imageCreditLine: string | null;
      };
      skipped?: boolean;
    }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PersistResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slideId, imageUrl, imageCreditLine, overwrite } = req.body ?? {};
  const normalizedSlideId =
    typeof slideId === "number"
      ? slideId
      : typeof slideId === "string" && slideId.trim()
        ? (/^\d+$/.test(slideId.trim()) ? Number(slideId.trim()) : slideId.trim())
        : null;

  if (normalizedSlideId === null) {
    return res.status(400).json({ error: "Invalid or missing slideId" });
  }

  if (!imageUrl || typeof imageUrl !== "string") {
    return res.status(400).json({ error: "Invalid or missing imageUrl" });
  }

  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { data: existing, error: loadError } = await supabase
      .from("map_story_slides")
      .select("id, image_url, image_credit_line")
      .eq("id", normalizedSlideId)
      .maybeSingle();

    if (loadError) {
      throw loadError;
    }

    if (!existing) {
      return res.status(404).json({ error: "Slide not found" });
    }

    const existingImageUrl = typeof existing.image_url === "string" ? existing.image_url.trim() : "";
    if (existingImageUrl && overwrite !== true) {
      return res.status(200).json({
        slide: {
          id: String(existing.id),
          imageUrl: existingImageUrl,
          imageCreditLine:
            typeof existing.image_credit_line === "string" && existing.image_credit_line.trim()
              ? existing.image_credit_line.trim()
              : null,
        },
        skipped: true,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("map_story_slides")
      .update({
        image_url: imageUrl.trim(),
        image_credit_line:
          typeof imageCreditLine === "string" && imageCreditLine.trim() ? imageCreditLine.trim() : null,
      })
      .eq("id", normalizedSlideId)
      .select("id, image_url, image_credit_line")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updated) {
      return res.status(404).json({ error: "Slide not found after update" });
    }

    return res.status(200).json({
      slide: {
        id: String(updated.id),
        imageUrl: typeof updated.image_url === "string" && updated.image_url.trim() ? updated.image_url.trim() : null,
        imageCreditLine:
          typeof updated.image_credit_line === "string" && updated.image_credit_line.trim()
            ? updated.image_credit_line.trim()
            : null,
      },
    });
  } catch (error) {
    console.error("[/api/map-popup-media/persist] failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
