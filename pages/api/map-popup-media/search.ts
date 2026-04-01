import type { NextApiRequest, NextApiResponse } from "next";
import type { MapPopupType } from "@/types/mapPopup";
import { searchMapPopupMedia } from "@/lib/server/mapPopup/mediaSearch";

type SearchResponse =
  | {
      item: {
        url: string;
        mediaType: "image" | "video" | "gif";
        source: "pexels" | "giphy";
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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const type = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
  const targetId = Array.isArray(req.query.target_id) ? req.query.target_id[0] : req.query.target_id;
  const slideText = Array.isArray(req.query.slide_text) ? req.query.slide_text[0] : req.query.slide_text;
  const excludeUrls = Array.isArray(req.query.exclude_url)
    ? req.query.exclude_url.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : typeof req.query.exclude_url === "string" && req.query.exclude_url.trim()
      ? [req.query.exclude_url.trim()]
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
