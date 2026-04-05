import type { NextApiRequest, NextApiResponse } from "next";
import type { MapPopupType } from "@/types/mapPopup";
import { searchMapPopupMedia } from "@/lib/server/mapPopup/mediaSearch";
import { applyApiGuard } from "@/utils/rateLimit";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "24kb",
    },
  },
};

type SearchResponse =
  | {
      item: {
        url: string;
        mediaType: "image" | "video" | "gif";
        source: "pexels" | "giphy" | "fallback";
        creditLine: string;
        searchQuery: string;
        relevanceScore: number;
      } | null;
    }
  | { error: string };

function isMapPopupType(value: string): value is MapPopupType {
  return [
    "country",
    "river",
    "sea",
    "physic",
    "flag",
    "animal",
    "culture",
    "weather",
    "food",
  ].includes(value);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>,
) {
  if (!applyApiGuard(req, res, {
    methods: ["GET", "POST"],
    limit: 20,
    maxBodyBytes: req.method === "POST" ? 24 * 1024 : undefined,
    keyPrefix: "map-popup-media-search",
  })) {
    return;
  }

  const payload = req.method === "POST" && req.body && typeof req.body === "object" ? req.body : req.query;
  const rawType = payload.type;
  const rawTargetId = payload.target_id;
  const rawSlideText = payload.slide_text;
  const rawExcludeUrls = payload.exclude_url;

  const type = Array.isArray(rawType) ? rawType[0] : rawType;
  const targetId = Array.isArray(rawTargetId) ? rawTargetId[0] : rawTargetId;
  const slideText = Array.isArray(rawSlideText) ? rawSlideText[0] : rawSlideText;
  const excludeUrls = Array.isArray(rawExcludeUrls)
    ? rawExcludeUrls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : typeof rawExcludeUrls === "string" && rawExcludeUrls.trim()
      ? [rawExcludeUrls.trim()]
      : [];

  if (!type || !isMapPopupType(type)) {
    return res.status(400).json({ error: "Invalid or missing type" });
  }

  if (!targetId || typeof targetId !== "string") {
    return res.status(400).json({ error: "Invalid or missing target_id" });
  }

  if (!slideText || typeof slideText !== "string") {
    return res.status(400).json({ error: "Invalid or missing slide_text" });
  }

  try {
    const item = await searchMapPopupMedia({
      type,
      targetId,
      slideText,
      excludeUrls,
    });

    return res.status(200).json({ item });
  } catch (error) {
    console.error("[/api/map-popup-media/search] failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
