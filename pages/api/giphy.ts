import type { NextApiRequest, NextApiResponse } from "next";
import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { withApiHandler } from "@/utils/apiHandler";
import { applyApiGuard } from "@/utils/rateLimit";

const TTL_MS = 60 * 60 * 1000;
const MAX_GIPHY_QUERY_LENGTH = 200;
const MAX_GIPHY_QUERY_ENCODED_LENGTH = 72;

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

  let trimmed = value.slice(0, MAX_GIPHY_QUERY_LENGTH).trim();
  while (trimmed && encodeURIComponent(trimmed).length > maxEncodedLength) {
    trimmed = trimmed.slice(0, -1).trim();
  }
  return trimmed;
}

function buildFallbackQueries(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  const variants = [
    value,
    clampQueryByEncodedLength(value, 48),
    words.slice(0, 4).join(" "),
    words.slice(0, 3).join(" "),
    words.slice(0, 2).join(" "),
    words[0] || "",
    "parrot music",
    "parrot",
  ];

  return Array.from(
    new Set(
      variants
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => clampQueryByEncodedLength(item, MAX_GIPHY_QUERY_ENCODED_LENGTH))
        .filter(Boolean),
    ),
  );
}

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
  normalizedUrl?: string;
  normalizedMediaType?: "video";
  normalizedMimeType?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
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

type GiphyResponse = {
  items: GiphyItem[];
  query: string;
  cached: boolean;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GiphyResponse | { error: string }>,
) {
  if (
    !applyApiGuard(req, res, {
      methods: ["GET", "POST"],
      limit: 300,
      windowMs: 60_000,
      maxBodyBytes: 16 * 1024,
      keyPrefix: "giphy",
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
    ? clampQueryByEncodedLength(rawQuery.trim().slice(0, MAX_GIPHY_QUERY_LENGTH).trim(), MAX_GIPHY_QUERY_ENCODED_LENGTH)
    : "";
  const limit = Math.min(
    30,
    Math.max(1, Number(typeof rawLimit === "string" || typeof rawLimit === "number" ? rawLimit : "5") || 5),
  );

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GIPHY API key" });
  }

  const queries = buildFallbackQueries(query);

  for (const candidateQuery of queries) {
    const cacheKey = `giphy:${candidateQuery}:${limit}`;
    const cached = getMemoryCache<GiphyItem[]>(cacheKey);
    if (cached) {
      return res.status(200).json({ items: cached, query: candidateQuery, cached: true });
    }

    try {
      const searchParams = new URLSearchParams({
        api_key: apiKey,
        q: candidateQuery,
        limit: String(limit),
        rating: "g",
      });

      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?${searchParams.toString()}`,
      );

      if (!response.ok) {
        if (response.status === 414) {
          continue;
        }
        return res.status(response.status).json({ error: "Failed to fetch from Giphy" });
      }

      const json = await response.json();
      const items: GiphyItem[] =
        json?.data
          ?.map((item: any) => {
            const normalizedUrl =
              item?.images?.fixed_height?.mp4 ||
              item?.images?.fixed_width?.mp4 ||
              item?.images?.downsized_small?.mp4 ||
              item?.images?.original?.mp4 ||
              item?.images?.looping?.mp4 ||
              undefined;

            return {
              url: item?.images?.original?.url || item?.images?.downsized_large?.url,
              mediaType: "gif" as const,
              normalizedUrl,
              normalizedMediaType: normalizedUrl ? "video" as const : undefined,
              normalizedMimeType: normalizedUrl ? "video/mp4" : undefined,
              previewUrl:
                item?.images?.fixed_width_small?.webp ||
                item?.images?.preview_gif?.url ||
                item?.images?.fixed_width_small?.url ||
                undefined,
              width: Number(item?.images?.original?.width) || undefined,
              height: Number(item?.images?.original?.height) || undefined,
            };
          })
          ?.filter((item: GiphyItem, index: number) =>
            Boolean(item.url) &&
            isSafeMediaText(
              json?.data?.[index]?.title,
              json?.data?.[index]?.slug,
              json?.data?.[index]?.username,
              candidateQuery,
            ),
          ) ?? [];

      return res.status(200).json({
        items: setMemoryCache(cacheKey, items, TTL_MS),
        query: candidateQuery,
        cached: false,
      });
    } catch (error) {
      console.error("[/api/giphy] request failed", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  try {
    return res.status(200).json({ items: [], query, cached: false });
  } catch (error) {
    console.error("[/api/giphy] request failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET", "POST"],
      maxBodyBytes: 16 * 1024,
      keyPrefix: "giphy",
    },
    cacheControl: "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  },
  handler,
);
