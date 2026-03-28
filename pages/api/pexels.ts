import type { NextApiRequest, NextApiResponse } from "next";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";

const TTL_MS = 60 * 60 * 1000;

type PexelsItem = {
  url: string;
  photographer?: string;
};

type PexelsResponse = {
  items: PexelsItem[];
  query: string;
  cached: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PexelsResponse | { error: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limit = Math.min(
    10,
    Math.max(1, Number(typeof req.query.limit === "string" ? req.query.limit : "5") || 5),
  );

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing Pexels API key" });
  }

  const cacheKey = `pexels:${query}:${limit}`;
  const cached = getMemoryCache<PexelsItem[]>(cacheKey);
  if (cached) {
    return res.status(200).json({ items: cached, query, cached: true });
  }

  try {
    const searchParams = new URLSearchParams({
      query,
      per_page: String(limit),
      orientation: "portrait",
    });

    const response = await fetch(
      `https://api.pexels.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: apiKey,
        },
      },
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from Pexels" });
    }

    const json = await response.json();
    const items: PexelsItem[] =
      json?.photos
        ?.map((photo: any) => ({
          url: photo?.src?.large || photo?.src?.medium || photo?.src?.original,
          photographer: photo?.photographer || undefined,
        }))
        ?.filter((item: PexelsItem) => Boolean(item.url)) ?? [];

    return res
      .status(200)
      .json({ items: setMemoryCache(cacheKey, items, TTL_MS), query, cached: false });
  } catch (error) {
    console.error("[/api/pexels] request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
