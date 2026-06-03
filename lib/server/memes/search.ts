import { dedupeMedia, normalizeMedia } from "./normalize";
import { rankMedia } from "./rank";
import { getCachedSearch, setCachedSearch, upsertMemeMedia } from "./cache";
import { searchGiphy } from "./providers/giphy";
import { searchImgflip } from "./providers/imgflip";
import { searchLapLapLaStickers } from "./providers/laplaplaStickers";
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
  laplapla: searchLapLapLaStickers,
};

const PROVIDER_TIMEOUT_MS = 4500;
const DIVERSIFIED_PROVIDER_ORDER: UnifiedMemeProvider[] = [
  "giphy",
  "pexels",
  "pixabay",
  "reddit",
  "imgflip",
  "laplapla",
];
const DIVERSIFIED_TYPE_ORDER: UnifiedMemeMedia["type"][] = [
  "gif",
  "mp4",
  "webm",
  "image",
  "sticker",
];
const MAX_PERSISTED_SEARCH_WINDOW = 240;
const PROVIDER_HAS_MORE_LOOKAHEAD = 1;

function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return work(controller.signal).finally(() => clearTimeout(timeout));
}

function diversifyProviders(items: UnifiedMemeMedia[], enabled: boolean) {
  if (!enabled) return items;

  const groups = new Map<UnifiedMemeProvider, UnifiedMemeMedia[]>();
  for (const item of items) {
    const group = groups.get(item.provider) || [];
    group.push(item);
    groups.set(item.provider, group);
  }

  const orderedProviders = [
    ...DIVERSIFIED_PROVIDER_ORDER.filter((provider) => groups.has(provider)),
    ...Array.from(groups.keys()).filter((provider) => !DIVERSIFIED_PROVIDER_ORDER.includes(provider)),
  ];
  const diversified: UnifiedMemeMedia[] = [];

  while (orderedProviders.some((provider) => (groups.get(provider)?.length || 0) > 0)) {
    for (const provider of orderedProviders) {
      const next = groups.get(provider)?.shift();
      if (next) diversified.push(next);
    }
  }

  return diversified;
}

function diversifyMediaTypes(items: UnifiedMemeMedia[], enabled: boolean) {
  if (!enabled) return items;

  const groups = new Map<UnifiedMemeMedia["type"], UnifiedMemeMedia[]>();
  for (const item of items) {
    const group = groups.get(item.type) || [];
    group.push(item);
    groups.set(item.type, group);
  }

  const orderedTypes = [
    ...DIVERSIFIED_TYPE_ORDER.filter((type) => groups.has(type)),
    ...Array.from(groups.keys()).filter((type) => !DIVERSIFIED_TYPE_ORDER.includes(type)),
  ];
  const diversified: UnifiedMemeMedia[] = [];

  while (orderedTypes.some((type) => (groups.get(type)?.length || 0) > 0)) {
    for (const type of orderedTypes) {
      const next = groups.get(type)?.shift();
      if (next) diversified.push(next);
    }
  }

  return diversified;
}

export async function searchUnifiedMemes(params: UnifiedMemeSearchParams): Promise<UnifiedMemeSearchResponse> {
  const shouldPersist = params.persist !== false;
  const resultEnd = params.offset + params.limit;
  const providerWindow = Math.min(resultEnd + PROVIDER_HAS_MORE_LOOKAHEAD, MAX_PERSISTED_SEARCH_WINDOW);

  if (shouldPersist) {
    const cached = await getCachedSearch(params);
    if (cached && cached.items.length >= resultEnd) {
      return {
        items: cached.items.slice(params.offset, resultEnd),
        query: params.query,
        cached: true,
        hasMore: cached.items.length > resultEnd,
      };
    }
  }

  const providerNames = params.providers?.length ? params.providers : Object.keys(PROVIDERS) as UnifiedMemeProvider[];
  const settled = await Promise.allSettled(
    providerNames.map((provider) =>
      withTimeout(
        (signal) => PROVIDERS[provider]({ ...params, limit: providerWindow, offset: 0, signal }),
        PROVIDER_TIMEOUT_MS,
      ),
    ),
  );

  const rawItems = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const normalized = rawItems.map(normalizeMedia).filter(Boolean) as UnifiedMemeMedia[];
  const filtered = normalized.filter((item) => !params.types?.length || params.types.includes(item.type));
  const ranked = rankMedia(dedupeMedia(filtered), params);
  const shouldDiversify = !params.providers?.length && (!params.types?.length || params.types.length > 1);
  const diversifiedByType = diversifyMediaTypes(ranked, shouldDiversify);
  const diversified = diversifyProviders(diversifiedByType, shouldDiversify);
  const persistWindow = Math.min(Math.max(resultEnd + PROVIDER_HAS_MORE_LOOKAHEAD, params.limit), MAX_PERSISTED_SEARCH_WINDOW);
  const itemsForResponse = shouldPersist ? diversified.slice(0, persistWindow) : diversified;
  const persisted = shouldPersist ? await upsertMemeMedia(itemsForResponse) : itemsForResponse;

  if (shouldPersist) {
    await setCachedSearch(params, persisted);
  }

  return {
    items: persisted.slice(params.offset, resultEnd),
    query: params.query,
    cached: false,
    hasMore: persisted.length > resultEnd,
  };
}
