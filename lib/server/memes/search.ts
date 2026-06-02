import { dedupeMedia, normalizeMedia } from "./normalize";
import { rankMedia } from "./rank";
import { getCachedSearch, setCachedSearch, upsertMemeMedia } from "./cache";
import { searchGiphy } from "./providers/giphy";
import { searchImgflip } from "./providers/imgflip";
import { searchPexels } from "./providers/pexels";
import { searchPixabay } from "./providers/pixabay";
import { searchReddit } from "./providers/reddit";
import type { ProviderSearchParams, RawProviderMedia, UnifiedMemeMedia, UnifiedMemeProvider, UnifiedMemeSearchParams, UnifiedMemeSearchResponse } from "./types";

const PROVIDERS: Record<UnifiedMemeProvider, (params: ProviderSearchParams) => Promise<RawProviderMedia[]>> = {
  giphy: searchGiphy,
  reddit: searchReddit,
  imgflip: searchImgflip,
  pixabay: searchPixabay,
  pexels: searchPexels,
};

const PROVIDER_TIMEOUT_MS = 4500;

function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return work(controller.signal).finally(() => clearTimeout(timeout));
}

export async function searchUnifiedMemes(params: UnifiedMemeSearchParams): Promise<UnifiedMemeSearchResponse> {
  const cached = await getCachedSearch(params);
  if (cached) {
    return {
      items: cached.items.slice(params.offset, params.offset + params.limit),
      query: params.query,
      cached: true,
      hasMore: cached.items.length > params.offset + params.limit,
    };
  }

  const providerNames = params.providers?.length ? params.providers : Object.keys(PROVIDERS) as UnifiedMemeProvider[];
  const settled = await Promise.allSettled(
    providerNames.map((provider) =>
      withTimeout((signal) => PROVIDERS[provider]({ ...params, signal }), PROVIDER_TIMEOUT_MS),
    ),
  );

  const rawItems = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const normalized = rawItems.map(normalizeMedia).filter(Boolean) as UnifiedMemeMedia[];
  const filtered = normalized.filter((item) => !params.types?.length || params.types.includes(item.type));
  const ranked = rankMedia(dedupeMedia(filtered), params);
  const persisted = await upsertMemeMedia(ranked);

  await setCachedSearch(params, persisted);

  return {
    items: persisted.slice(params.offset, params.offset + params.limit),
    query: params.query,
    cached: false,
    hasMore: persisted.length > params.offset + params.limit,
  };
}
