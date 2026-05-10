import type { Lang } from "@/i18n";
import type { ParrotStyleRecord } from "@/lib/parrots/catalog";

type ParrotMusicStylesApiResponse = {
  presets?: unknown;
};

type CacheEntry = {
  expiresAt: number;
  presets: ParrotStyleRecord[];
};

const CACHE_TTL_MS = 30_000;
const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<ParrotStyleRecord[]>>();

export async function fetchParrotMusicStyles(lang: Lang): Promise<ParrotStyleRecord[]> {
  return fetchParrotMusicStylesWithOptions(lang);
}

export async function fetchParrotMusicStylesWithOptions(
  lang: Lang,
  options?: {
    rawTitles?: boolean;
  },
): Promise<ParrotStyleRecord[]> {
  const cacheKey = `${lang}:${options?.rawTitles ? "raw" : "localized"}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.presets;
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const response = await fetch(
      `/api/parrot-music-styles?lang=${encodeURIComponent(lang)}&rawTitles=${options?.rawTitles ? "1" : "0"}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to load parrot music styles: ${response.status}`);
    }

    const data = await response.json() as ParrotMusicStylesApiResponse;
    const presets = Array.isArray(data.presets) ? data.presets as ParrotStyleRecord[] : [];

    responseCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      presets,
    });

    return presets;
  })();

  inFlightRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}
