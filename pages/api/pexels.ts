import type { NextApiRequest, NextApiResponse } from "next";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

const TTL_MS = 60 * 60 * 1000;
const MAX_PEXELS_QUERY_LENGTH = 160;
const MAX_PEXELS_QUERY_ENCODED_LENGTH = 120;

function clampQueryByEncodedLength(value: string, maxEncodedLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (encodeURIComponent(next).length > maxEncodedLength) {
      break;
    }
    current = next;
  }

  if (current) {
    return current;
  }

  let trimmed = value.slice(0, MAX_PEXELS_QUERY_LENGTH).trim();
  while (trimmed && encodeURIComponent(trimmed).length > maxEncodedLength) {
    trimmed = trimmed.slice(0, -1).trim();
  }
  return trimmed;
}

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
  description?: string;
};

const BLOCKED_MEDIA_TERMS = [
  "kiss",
  "kissing",
  "romance",
  "romantic",
  "couple",
  "wedding",
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

type PexelsResponse = {
  items: PexelsItem[];
  query: string;
  cached: boolean;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PexelsResponse | { error: string }>,
) {
  if (
    !applyApiGuard(req, res, {
      methods: ["GET", "POST"],
      limit: 30,
      windowMs: 60_000,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "pexels",
    })
  ) {
    return;
  }

  const payload = req.method === "POST" && req.body && typeof req.body === "object" ? req.body : req.query;
  const rawQueryValue =
    (payload as Record<string, unknown>).query ??
    (payload as Record<string, unknown>).q;
  const rawQuery = Array.isArray(rawQueryValue) ? rawQueryValue[0] : rawQueryValue;
  const rawLimit = Array.isArray(payload.limit) ? payload.limit[0] : payload.limit;
  const query = typeof rawQuery === "string"
    ? clampQueryByEncodedLength(rawQuery.trim().slice(0, MAX_PEXELS_QUERY_LENGTH).trim(), MAX_PEXELS_QUERY_ENCODED_LENGTH)
    : "";
  const limit = Math.min(
    30,
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
          description: photo?.alt || undefined,
        }))
        ?.filter((item: PexelsItem) =>
          Boolean(item.url) && isSafeMediaText(item.description, item.photographer, query),
        ) ?? [];

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
          description: [
            video?.url,
            ...(Array.isArray(video?.tags) ? video.tags.map((tag: any) => tag?.title || tag) : []),
          ].filter(Boolean).join(" "),
        }))
        ?.filter((item: PexelsItem) =>
          Boolean(item.url) && isSafeMediaText(item.description, item.photographer, query),
        ) ?? [];

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
      maxBodyBytes: 16 * 1024,
      keyPrefix: "pexels",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
