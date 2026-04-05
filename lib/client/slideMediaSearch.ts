export type SlideMediaCandidate = {
  url: string;
  mediaType: "gif" | "image" | "video";
};

type SearchSource = "giphy" | "pexels";

type SearchResponse = {
  items?: SlideMediaCandidate[];
};

const normalizeQuery = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
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
  const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&limit=${limit}`);
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
