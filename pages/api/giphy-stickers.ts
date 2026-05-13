import type { NextApiRequest, NextApiResponse } from "next";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

const TTL_MS = 30 * 60 * 1000;
const MAX_QUERY_LENGTH = 96;
const LAPLAPLA_TAG = "laplapla";

type StickerItem = {
  id: string;
  url: string;
  previewUrl: string;
  mediaType: "sticker";
  animationType: "webp" | "apng" | "gif";
  width?: number;
  height?: number;
  source: "laplapla" | "giphy";
  tags: string[];
  priority: number;
};

type GiphyStickerResponse = {
  items: StickerItem[];
  query: string;
  cached: boolean;
  hasMore: boolean;
};

const BLOCKED_MEDIA_TERMS = [
  "kiss",
  "kissing",
  "romance",
  "romantic",
  "couple",
  "sexy",
  "sensual",
  "lingerie",
  "bikini",
  "smoking",
  "cigarette",
  "tobacco",
  "vape",
  "hookah",
  "alcohol",
  "beer",
  "wine",
  "vodka",
  "drunk",
];

const isSafeMediaText = (...values: Array<string | undefined | null>) => {
  const haystack = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return !BLOCKED_MEDIA_TERMS.some((term) => haystack.includes(term));
};

function normalizeQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

function inferAnimationType(url: string): StickerItem["animationType"] {
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".png")) return "apng";
  if (clean.endsWith(".gif")) return "gif";
  return "webp";
}

function pickStickerUrl(item: any) {
  return (
    item?.images?.fixed_height?.webp ||
    item?.images?.downsized_medium?.url ||
    item?.images?.original?.webp ||
    item?.images?.original?.url ||
    ""
  );
}

function pickPreviewUrl(item: any) {
  return (
    item?.images?.fixed_width_small?.webp ||
    item?.images?.preview_gif?.url ||
    item?.images?.fixed_width_small?.url ||
    pickStickerUrl(item)
  );
}

function toStickerItem(item: any, source: StickerItem["source"], priorityBase: number): StickerItem | null {
  const url = pickStickerUrl(item);
  const previewUrl = pickPreviewUrl(item);
  if (!url || !previewUrl) return null;

  const title = String(item?.title || "");
  const slug = String(item?.slug || "");
  const username = String(item?.username || "");
  if (!isSafeMediaText(title, slug, username)) return null;

  const tags = [
    source === "laplapla" ? LAPLAPLA_TAG : "",
    username,
    title,
  ]
    .filter(Boolean)
    .map((tag) => String(tag).toLowerCase());

  return {
    id: String(item?.id || `${source}-${url}`),
    url,
    previewUrl,
    mediaType: "sticker",
    animationType: inferAnimationType(url),
    width: Number(item?.images?.fixed_height?.width || item?.images?.original?.width) || undefined,
    height: Number(item?.images?.fixed_height?.height || item?.images?.original?.height) || undefined,
    source,
    tags,
    priority: priorityBase,
  };
}

async function fetchGiphyStickers(apiKey: string, query: string, limit: number, offset: number, source: StickerItem["source"]) {
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    offset: String(offset),
    rating: "g",
  });

  const endpointQuery = query.trim();
  const endpoint = endpointQuery
    ? "search"
    : "trending";

  if (endpointQuery) {
    searchParams.set("q", endpointQuery);
  }

  const response = await fetch(
    `https://api.giphy.com/v1/stickers/${endpoint}?${searchParams.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`GIPHY stickers request failed: ${response.status}`);
  }

  const json = await response.json();
  const priorityBase = source === "laplapla" ? 1000 : 0;

  return (json?.data || [])
    .map((item: any) => toStickerItem(item, source, priorityBase))
    .filter(Boolean) as StickerItem[];
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GiphyStickerResponse | { error: string }>,
) {
  if (
    !applyApiGuard(req, res, {
      methods: ["GET", "POST"],
      limit: 300,
      windowMs: 60_000,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "giphy-stickers",
    })
  ) {
    return;
  }

  const payload = req.method === "POST" && req.body && typeof req.body === "object" ? req.body : req.query;
  const rawQuery = (payload as Record<string, unknown>).query ?? (payload as Record<string, unknown>).q;
  const rawLimit = (payload as Record<string, unknown>).limit;
  const rawOffset = (payload as Record<string, unknown>).offset;
  const query = normalizeQuery(Array.isArray(rawQuery) ? rawQuery[0] : rawQuery);
  const limit = Math.min(36, Math.max(1, Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit) || 24));
  const offset = Math.max(0, Number(Array.isArray(rawOffset) ? rawOffset[0] : rawOffset) || 0);

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GIPHY API key" });
  }

  const cacheKey = `giphy-stickers:${query || "trending"}:${limit}:${offset}`;
  const cached = getMemoryCache<StickerItem[]>(cacheKey);
  if (cached) {
    return res.status(200).json({
      items: cached,
      query,
      cached: true,
      hasMore: cached.length >= limit,
    });
  }

  try {
    const brandedQuery = query ? `${LAPLAPLA_TAG} ${query}` : LAPLAPLA_TAG;
    const [branded, regular] = await Promise.all([
      fetchGiphyStickers(apiKey, brandedQuery, limit, offset, "laplapla").catch(() => []),
      fetchGiphyStickers(apiKey, query, limit, offset, "giphy"),
    ]);

    const seen = new Set<string>();
    const items = [...branded, ...regular]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    return res.status(200).json({
      items: setMemoryCache(cacheKey, items, TTL_MS),
      query,
      cached: false,
      hasMore: regular.length >= limit || branded.length >= limit,
    });
  } catch (error) {
    console.error("[/api/giphy-stickers] request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST"],
      maxBodyBytes: 16 * 1024,
      keyPrefix: "giphy-stickers",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
