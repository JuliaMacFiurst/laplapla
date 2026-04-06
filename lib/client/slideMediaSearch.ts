export type SlideMediaCandidate = {
  url: string;
  mediaType: "gif" | "image" | "video";
};

type SearchSource = "giphy" | "pexels";

type SearchResponse = {
  items?: SlideMediaCandidate[];
};

const MAX_MEDIA_QUERY_LENGTH = 120;
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

const fetchSourceItems = async (
  source: SearchSource,
  query: string,
  limit = 8,
): Promise<SlideMediaCandidate[]> => {
  const endpoint = source === "giphy" ? "/api/giphy" : "/api/pexels";
  const safeQuery = clampQueryByEncodedLength(
    normalizeQuery(query),
    source === "giphy" ? MAX_GIPHY_QUERY_ENCODED_LENGTH : MAX_PEXELS_QUERY_ENCODED_LENGTH,
  );

  if (!safeQuery) {
    return [];
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: safeQuery,
      limit,
    }),
  });
  if (!response.ok) {
    return [];
  }

  const json = (await response.json()) as SearchResponse;
  if (!Array.isArray(json.items)) {
    return [];
  }

  return json.items.filter((item): item is SlideMediaCandidate => Boolean(item?.url && item?.mediaType));
};

export async function findAlternativeSlideMedia({
  queries,
  excludedUrls = [],
  preferredSources = ["giphy", "pexels"],
}: {
  queries: string[];
  excludedUrls?: string[];
  preferredSources?: SearchSource[];
}): Promise<SlideMediaCandidate | null> {
  const uniqueQueries = Array.from(new Set(queries.map(normalizeQuery).filter(Boolean)));
  const excluded = new Set(excludedUrls.filter(Boolean));
  const sources = Array.from(new Set(preferredSources));

  for (const query of uniqueQueries) {
    for (const source of sources) {
      const items = await fetchSourceItems(source, query);
      const alternative = items.find((item) => !excluded.has(item.url));
      if (alternative) {
        return alternative;
      }
    }
  }

  return null;
}
