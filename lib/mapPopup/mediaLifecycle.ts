import type { MapPopupSlide } from "@/types/mapPopup";

export type MapPopupMediaStatus =
  | "loading"
  | "fallback"
  | "missing"
  | "ready";

export function isLocalMapFallbackUrl(url: string | null | undefined): boolean {
  return Boolean(url?.includes("/raccoons/raccoon_with_map/"));
}

export function hasResolvedSlideMedia(
  url: string | null | undefined,
): boolean {
  return Boolean(url?.trim()) && !isLocalMapFallbackUrl(url);
}

export function getInitialSlideMediaStatus(
  url: string | null | undefined,
): MapPopupMediaStatus {
  return hasResolvedSlideMedia(url) ? "ready" : "fallback";
}

export function selectSlidesForMediaHydration(
  slides: MapPopupSlide[],
  currentSlideIndex: number,
  isBlocked: (requestKey: string) => boolean,
  storyId: string | number,
): MapPopupSlide[] {
  return [slides[currentSlideIndex], slides[currentSlideIndex + 1]]
    .filter((slide): slide is MapPopupSlide => Boolean(slide))
    .filter((slide) => {
      if (hasResolvedSlideMedia(slide.imageUrl) || !slide.text.trim()) {
        return false;
      }

      return !isBlocked(`${storyId}:${slide.id}`);
    });
}

export function shouldPersistResolvedMedia(item: {
  url: string;
  source?: string | null;
}): boolean {
  return (
    item.source !== "fallback" &&
    hasResolvedSlideMedia(item.url)
  );
}

export function isLatestMediaRequestVersion(
  requestVersion: number,
  latestRequestVersion: number,
): boolean {
  return requestVersion === latestRequestVersion;
}
