import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";
import { persistResolvedSlideMedia } from "@/lib/server/mapPopup/persistence";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12kb",
    },
  },
};

type PersistMediaResponse =
  | {
      ok: true;
      slide: {
        id?: string | number | null;
        story_id?: string | number | null;
        slide_order?: number | null;
        text?: string | null;
        image_url?: string | null;
        image_credit_line?: string | null;
      } | null;
    }
  | { error: string };

function isAllowedImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("/supabase-storage/");
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PersistMediaResponse>,
) {
  const { storyId, slideId, slideOrder, slideText, imageUrl, imageCreditLine } = req.body ?? {};

  const normalizedStoryId =
    typeof storyId === "number" || (typeof storyId === "string" && storyId.trim())
      ? storyId
      : null;
  const normalizedSlideId = typeof slideId === "string" && slideId.trim() ? slideId.trim() : null;
  const normalizedSlideOrder = typeof slideOrder === "number"
    ? slideOrder
    : typeof slideOrder === "string" && slideOrder.trim()
      ? Number(slideOrder)
      : null;
  const normalizedSlideText = typeof slideText === "string" && slideText.trim()
    ? slideText.trim()
    : null;
  const normalizedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const normalizedCreditLine =
    typeof imageCreditLine === "string" && imageCreditLine.trim()
      ? imageCreditLine.trim()
      : null;

  if (normalizedStoryId == null) {
    return res.status(400).json({ error: "Invalid or missing storyId" });
  }

  if (!normalizedSlideId && !Number.isFinite(normalizedSlideOrder)) {
    return res.status(400).json({ error: "Invalid or missing slide reference" });
  }

  if (!normalizedImageUrl || !isAllowedImageUrl(normalizedImageUrl)) {
    return res.status(400).json({ error: "Invalid or missing imageUrl" });
  }

  const slide = await persistResolvedSlideMedia({
    storyId: normalizedStoryId,
    slideId: normalizedSlideId,
    slideOrder: Number.isFinite(normalizedSlideOrder) ? normalizedSlideOrder : null,
    slideText: normalizedSlideText,
    imageUrl: normalizedImageUrl,
    imageCreditLine: normalizedCreditLine,
  });

  return res.status(200).json({ ok: true, slide });
}

export default withApiHandler(
  {
    guard: {
      methods: ["POST"],
      limit: 120,
      windowMs: 60_000,
      maxBodyBytes: 12 * 1024,
      keyPrefix: "map-popup-content-media",
    },
  },
  handler,
);
