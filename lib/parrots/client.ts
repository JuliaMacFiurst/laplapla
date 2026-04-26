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
const responseCache = new Map<Lang, CacheEntry>();
const inFlightRequests = new Map<Lang, Promise<ParrotStyleRecord[]>>();

export async function fetchParrotMusicStyles(lang: Lang): Promise<ParrotStyleRecord[]> {
  const cached = responseCache.get(lang);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.presets;
  }

  const existingRequest = inFlightRequests.get(lang);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const response = await fetch(`/api/parrot-music-styles?lang=${encodeURIComponent(lang)}`);
    if (!response.ok) {
      throw new Error(`Failed to load parrot music styles: ${response.status}`);
    }

    const data = await response.json() as ParrotMusicStylesApiResponse;
    const presets = Array.isArray(data.presets) ? data.presets as ParrotStyleRecord[] : [];

    responseCache.set(lang, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      presets,
    });

    return presets;
  })();

  inFlightRequests.set(lang, request);

  try {
    return await request;
  } finally {
    inFlightRequests.delete(lang);
  }
}
