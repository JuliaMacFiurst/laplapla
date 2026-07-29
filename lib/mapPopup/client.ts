import type { MapPopupContent, MapPopupType } from "@/types/mapPopup";

const MAX_RETRY_AFTER_MS = 60_000;

export class MapPopupRequestError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;

  constructor(status: number, retryAfterMs: number | null) {
    super(`Map popup request failed with status ${status}`);
    this.name = "MapPopupRequestError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function parseRetryAfterMs(
  value: string | null,
  now = Date.now(),
): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.ceil(seconds * 1000));
  }

  const date = Date.parse(value);
  if (!Number.isFinite(date)) {
    return null;
  }

  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, date - now));
}

export async function loadMapPopupContent(
  type: MapPopupType,
  targetId: string,
  lang: string,
  fetcher: typeof fetch = fetch,
): Promise<MapPopupContent | null> {
  const response = await fetcher(
    `/api/map-popup-content?type=${encodeURIComponent(type)}&target_id=${encodeURIComponent(targetId)}&lang=${encodeURIComponent(lang)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new MapPopupRequestError(
      response.status,
      response.status === 429
        ? parseRetryAfterMs(response.headers.get("Retry-After"))
        : null,
    );
  }

  return (await response.json()) as MapPopupContent;
}
