import type { NextApiRequest, NextApiResponse } from "next";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { withApiHandler } from "@/utils/apiHandler";

const TTL_MS = 60 * 60 * 1000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
};

type PexelsItem = {
  url: string;
  mediaType: "image" | "video";
  photographer?: string;
};

type PexelsResponse = {
  items: PexelsItem[];
  query: string;
  cached: boolean;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PexelsResponse | { error: string }>,
) {
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
    const photoSearchParams = new URLSearchParams({
      query,
      per_page: String(limit),
      orientation: "portrait",
    });

    const videoSearchParams = new URLSearchParams({
      query,
      per_page: String(limit),
    });

    const [photoResponse, videoResponse] = await Promise.all([
      fetch(`https://api.pexels.com/v1/search?${photoSearchParams.toString()}`, {
        headers: {
          Authorization: apiKey,
        },
      }),
      fetch(`https://api.pexels.com/videos/search?${videoSearchParams.toString()}`, {
        headers: {
          Authorization: apiKey,
        },
      }),
    ]);

    if (!photoResponse.ok && !videoResponse.ok) {
      return res
        .status(Math.max(photoResponse.status, videoResponse.status, 500))
        .json({ error: "Failed to fetch from Pexels" });
    }

    const photoJson = photoResponse.ok ? await photoResponse.json() : null;
    const videoJson = videoResponse.ok ? await videoResponse.json() : null;

    const photos: PexelsItem[] =
      photoJson?.photos
        ?.map((photo: any) => ({
          url: photo?.src?.large || photo?.src?.medium || photo?.src?.original,
          mediaType: "image" as const,
          photographer: photo?.photographer || undefined,
        }))
        ?.filter((item: PexelsItem) => Boolean(item.url)) ?? [];

    const videos: PexelsItem[] =
      videoJson?.videos
        ?.map((video: any) => ({
          url:
            video?.video_files?.find((file: any) => file?.file_type === "video/mp4" && file?.width >= 720)
              ?.link ||
            video?.video_files?.find((file: any) => file?.file_type === "video/mp4")
              ?.link,
          mediaType: "video" as const,
          photographer: video?.user?.name || undefined,
        }))
        ?.filter((item: PexelsItem) => Boolean(item.url)) ?? [];

    const items: PexelsItem[] = [];
    const maxLength = Math.max(photos.length, videos.length);

    for (let index = 0; index < maxLength; index += 1) {
      if (photos[index]) items.push(photos[index]);
      if (videos[index]) items.push(videos[index]);
    }

    return res
      .status(200)
      .json({ items: setMemoryCache(cacheKey, items, TTL_MS), query, cached: false });
  } catch (error) {
    console.error("[/api/pexels] request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST"],
      limit: 30,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "pexels",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
