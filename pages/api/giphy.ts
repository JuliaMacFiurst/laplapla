import type { NextApiRequest, NextApiResponse } from "next";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { applyApiGuard } from "@/utils/rateLimit";

const TTL_MS = 60 * 60 * 1000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
};

type GiphyItem = {
  url: string;
  mediaType: "gif";
  width?: number;
  height?: number;
};

type GiphyResponse = {
  items: GiphyItem[];
  query: string;
  cached: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GiphyResponse | { error: string }>,
) {
  if (!applyApiGuard(req, res, {
    methods: ["GET", "POST"],
    limit: 30,
    maxBodyBytes: req.method === "POST" ? 16 * 1024 : undefined,
    keyPrefix: "giphy",
  })) {
    return;
  }

  const payload = req.method === "POST" && req.body && typeof req.body === "object" ? req.body : req.query;
  const rawQuery = Array.isArray(payload.q) ? payload.q[0] : payload.q;
  const rawLimit = Array.isArray(payload.limit) ? payload.limit[0] : payload.limit;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const limit = Math.min(
    10,
    Math.max(1, Number(typeof rawLimit === "string" || typeof rawLimit === "number" ? rawLimit : "5") || 5),
  );

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GIPHY API key" });
  }

  const cacheKey = `giphy:${query}:${limit}`;
  const cached = getMemoryCache<GiphyItem[]>(cacheKey);
  if (cached) {
    return res.status(200).json({ items: cached, query, cached: true });
  }

  try {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      q: query,
      limit: String(limit),
      rating: "g",
    });

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`,
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from Giphy" });
    }

    const json = await response.json();
    const items: GiphyItem[] =
      json?.data
        ?.map((item: any) => ({
          url: item?.images?.original?.url || item?.images?.downsized_large?.url,
          mediaType: "gif" as const,
          width: Number(item?.images?.original?.width) || undefined,
          height: Number(item?.images?.original?.height) || undefined,
        }))
        ?.filter((item: GiphyItem) => Boolean(item.url)) ?? [];

    return res
      .status(200)
      .json({ items: setMemoryCache(cacheKey, items, TTL_MS), query, cached: false });
  } catch (error) {
    console.error("[/api/giphy] request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
