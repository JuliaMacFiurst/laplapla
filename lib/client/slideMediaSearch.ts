export type SlideMediaCandidate = {
  id: string;
  url: string;
  mediaType: "gif" | "image" | "video";
  source?: SearchSource;
  previewUrl?: string;
  sourceUrl?: string;
  sourceMediaType?: "gif" | "image" | "video" | "mp4" | "webm";
};

export type SearchSource = "giphy" | "pexels" | "laplapla";

type SearchResponse = {
  items?: Array<{
    provider?: string;
    providerId?: string;
    id?: string;
    type?: string;
    media_url?: string;
    preview_url?: string;
    source_url?: string;
  }>;
  cached?: boolean;
};

const MAX_MEDIA_QUERY_LENGTH = 200;
const MAX_GIPHY_QUERY_ENCODED_LENGTH = 72;
const MAX_PEXELS_QUERY_ENCODED_LENGTH = 120;

const clampQueryByEncodedLength = (value: string, maxEncodedLength: number) => {
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

  let trimmed = value.slice(0, MAX_MEDIA_QUERY_LENGTH).trim();
  while (trimmed && encodeURIComponent(trimmed).length > maxEncodedLength) {
    trimmed = trimmed.slice(0, -1).trim();
  }
  return trimmed;
};

const normalizeQuery = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MEDIA_QUERY_LENGTH)
    .trim();

export const buildSlideMediaQueries = (...parts: Array<string | null | undefined>) => {
  const normalized = parts
    .map((part) => normalizeQuery(part || ""))
    .filter(Boolean);

  const variants = [
    normalized.join(" "),
    normalized.slice(0, 2).join(" "),
    normalized.slice(-2).join(" "),
    normalized[0] || "",
  ];

  return Array.from(new Set(variants.filter(Boolean)));
};

export const buildAnimalSlideMediaQueries = (
  animalHints: string[],
  ...parts: Array<string | null | undefined>
) => {
  const animalQuery = normalizeQuery(animalHints.join(" "));
  const baseQueries = buildSlideMediaQueries(...parts);
  const queries = [
    ...baseQueries.map((query) => normalizeQuery(`${animalQuery} ${query}`)),
    animalQuery,
  ];

  return Array.from(new Set(queries.filter(Boolean)));
};

export const sanitizeSlideMediaQuery = (source: SearchSource, query: string) => {
  const normalized = normalizeQuery(query);
  return clampQueryByEncodedLength(
    normalized,
    source === "giphy" ? MAX_GIPHY_QUERY_ENCODED_LENGTH : MAX_PEXELS_QUERY_ENCODED_LENGTH,
  );
};

const fetchSourceItems = async (
  source: SearchSource,
  query: string,
  limit = 8,
): Promise<SlideMediaCandidate[]> => {
  const safeQuery = sanitizeSlideMediaQuery(source, query);

  if (!safeQuery) {
    return [];
  }

  const response = await fetch("/api/memes/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: safeQuery,
      limit,
      providers: source,
      types:
        source === "giphy"
          ? ["gif", "mp4", "webm"]
          : source === "laplapla"
            ? ["sticker", "image", "gif", "mp4", "webm"]
            : ["image", "mp4", "webm"],
    }),
  });
  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as SearchResponse;
  if (!Array.isArray(json.items)) {
    return [];
  }

  const mapped = json.items
    .map((item): SlideMediaCandidate | null => {
      const url = item?.media_url || "";
      const type = item?.type || "";
      if (!url) return null;
      const mediaType = type === "mp4" || type === "webm"
        ? "video"
        : type === "gif"
          ? "gif"
          : "image";
      return {
        id: item.id || `${item.provider || source}:${item.providerId || url}`,
        url,
        mediaType,
        source,
        previewUrl: item.preview_url,
        sourceUrl: item.source_url,
        sourceMediaType: type === "mp4" || type === "webm" ? type : mediaType,
      };
    })
    .filter(Boolean) as SlideMediaCandidate[];

  if (process.env.NODE_ENV === "development") {
    console.info("[slide-media] unified search", {
      source,
      query: safeQuery,
      count: mapped.length,
      cached: Boolean(json.cached),
    });
  }

  return mapped;
};

export async function findAlternativeSlideMedia({
  queries,
  excludedUrls = [],
  preferredSources = ["giphy", "pexels", "laplapla"],
  allowedMediaTypes,
  excludedIds = [],
  selectionSeed = "",
}: {
  queries: string[];
  excludedUrls?: string[];
  preferredSources?: SearchSource[];
  allowedMediaTypes?: SlideMediaCandidate["mediaType"][];
  excludedIds?: string[];
  selectionSeed?: string;
}): Promise<SlideMediaCandidate | null> {
  const uniqueQueries = Array.from(new Set(queries.map(normalizeQuery).filter(Boolean)));
  const excluded = new Set(excludedUrls.filter(Boolean));
  const excludedMediaIds = new Set(excludedIds.filter(Boolean));
  const sources = Array.from(new Set(preferredSources));
  const allowedTypes = allowedMediaTypes?.length
    ? new Set(allowedMediaTypes)
    : null;

  for (const query of uniqueQueries) {
    for (const source of sources) {
      const items = await fetchSourceItems(source, query);
      const candidates = items.filter(
        (item) =>
          !excludedMediaIds.has(item.id) &&
          !excluded.has(item.url) &&
          (!allowedTypes || allowedTypes.has(item.mediaType)),
      );
      const pool = candidates.slice(0, 8);
      const seed = Array.from(`${selectionSeed}:${query}:${source}`)
        .reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 0);
      const alternative = pool.length ? pool[seed % pool.length] : null;
      if (alternative) {
        return alternative;
      }
    }
  }

  return null;
}
