import type { MapPopupContent, MapPopupType } from "@/types/mapPopup";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  value: MapPopupContent | null;
};

const resolvedCache = new Map<string, CacheEntry>();
const inFlightCache = new Map<string, Promise<MapPopupContent | null>>();

export function buildMapPopupCacheKey(
  type: MapPopupType,
  targetId: string,
  lang: string,
): string {
  return `${lang}:${type}:${targetId}`;
}

export function getCachedMapPopupContent(
  key: string,
  loader: () => Promise<MapPopupContent | null>,
  options: { now?: number; ttlMs?: number } = {},
): Promise<MapPopupContent | null> {
  const now = options.now ?? Date.now();
  const cached = resolvedCache.get(key);
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.value);
  }

  if (cached) {
    resolvedCache.delete(key);
  }

  const pending = inFlightCache.get(key);
  if (pending) {
    return pending;
  }

  const request = loader()
    .then((value) => {
      resolvedCache.set(key, {
        value,
        expiresAt: now + (options.ttlMs ?? DEFAULT_TTL_MS),
      });
      return value;
    })
    .finally(() => {
      inFlightCache.delete(key);
    });

  inFlightCache.set(key, request);
  return request;
}

export function invalidateMapPopupContent(key?: string): void {
  if (key) {
    resolvedCache.delete(key);
    inFlightCache.delete(key);
    return;
  }

  resolvedCache.clear();
  inFlightCache.clear();
}

export function updateCachedMapPopupContent(
  key: string,
  update: (content: MapPopupContent | null) => MapPopupContent | null,
): void {
  const cached = resolvedCache.get(key);
  if (!cached) {
    return;
  }

  resolvedCache.set(key, {
    ...cached,
    value: update(cached.value),
  });
}
