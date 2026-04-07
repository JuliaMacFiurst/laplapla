import type { NextApiRequest, NextApiResponse } from "next";
import type { MapPopupType } from "@/types/mapPopup";
import { searchMapPopupMedia } from "@/lib/server/mapPopup/mediaSearch";
import { withApiHandler } from "@/utils/apiHandler";

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
      debug: {
        stage: string;
        cacheHit: boolean;
        type: string;
        targetId: string;
        slideTextSample: string;
        pexelsQueries: string[];
        giphyQueries: string[];
        excludeCount: number;
        chosenSource: string | null;
        chosenQuery: string | null;
      };
    }
  | { error: string };

const ROUTE = "/api/map-popup-media/search";

function logApi(status: number, startedAt: number) {
  console.log("[API]", {
    route: ROUTE,
    status,
    duration: Date.now() - startedAt,
  });
}

function logApiError(error: unknown) {
  console.error("[API ERROR]", {
    route: ROUTE,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

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

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>,
) {
  const startedAt = Date.now();
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
    res.status(400).json({ error: "Invalid or missing type" });
    logApi(res.statusCode, startedAt);
    return;
  }

  if (!targetId || typeof targetId !== "string") {
    res.status(400).json({ error: "Invalid or missing target_id" });
    logApi(res.statusCode, startedAt);
    return;
  }

  if (!slideText || typeof slideText !== "string") {
    res.status(400).json({ error: "Invalid or missing slide_text" });
    logApi(res.statusCode, startedAt);
    return;
  }

  try {
    const result = await searchMapPopupMedia({
      type,
      targetId,
      slideText,
      excludeUrls,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[map-popup-media/search]", result.debug);
    }

    res.status(200).json(result);
    logApi(res.statusCode, startedAt);
    return;
  } catch (error) {
    logApiError(error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST"],
      limit: 120,
      windowMs: 60_000,
      maxBodyBytes: 24 * 1024,
      keyPrefix: "map-popup-media-search",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
