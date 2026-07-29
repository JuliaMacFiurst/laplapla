import { describe, expect, it } from "vitest";
import {
  getInitialSlideMediaStatus,
  hasResolvedSlideMedia,
  isLatestMediaRequestVersion,
  isLocalMapFallbackUrl,
  selectSlidesForMediaHydration,
  shouldPersistResolvedMedia,
} from "@/lib/mapPopup/mediaLifecycle";
import type { MapPopupSlide } from "@/types/mapPopup";

const fallbackUrl =
  "https://assets.example/raccoons/raccoon_with_map/raccoon-rollup-map.gif";

const slides: MapPopupSlide[] = [
  { id: "empty", index: 0, text: "Empty", imageUrl: null },
  { id: "fallback", index: 1, text: "Fallback", imageUrl: fallbackUrl },
  {
    id: "real",
    index: 2,
    text: "Real",
    imageUrl: "https://cdn.example/real.webp",
  },
  { id: "later", index: 3, text: "Later", imageUrl: null },
];

describe("map popup media lifecycle", () => {
  it("treats empty and local raccoon media as temporary fallback", () => {
    expect(getInitialSlideMediaStatus(null)).toBe("fallback");
    expect(isLocalMapFallbackUrl(fallbackUrl)).toBe(true);
    expect(hasResolvedSlideMedia(fallbackUrl)).toBe(false);
    expect(getInitialSlideMediaStatus(fallbackUrl)).toBe("fallback");
  });

  it("treats genuine media as ready and excludes it from hydration", () => {
    expect(hasResolvedSlideMedia(slides[2].imageUrl)).toBe(true);
    expect(getInitialSlideMediaStatus(slides[2].imageUrl)).toBe("ready");
    expect(
      selectSlidesForMediaHydration(slides, 2, () => false, 7).map(
        (slide) => slide.id,
      ),
    ).toEqual(["later"]);
  });

  it("hydrates only the current and next slide", () => {
    expect(
      selectSlidesForMediaHydration(slides, 0, () => false, 7).map(
        (slide) => slide.id,
      ),
    ).toEqual(["empty", "fallback"]);
  });

  it("does not immediately retry a blocked automatic attempt", () => {
    expect(
      selectSlidesForMediaHydration(
        slides,
        0,
        (requestKey) => requestKey === "7:empty",
        7,
      ).map((slide) => slide.id),
    ).toEqual(["fallback"]);
  });

  it("allows one new automatic attempt after popup-scoped attempts reset", () => {
    const attempted = new Set(["7:empty"]);
    expect(
      selectSlidesForMediaHydration(
        slides,
        0,
        (requestKey) => attempted.has(requestKey),
        7,
      ).map((slide) => slide.id),
    ).toEqual(["fallback"]);

    attempted.clear();
    expect(
      selectSlidesForMediaHydration(
        slides,
        0,
        (requestKey) => attempted.has(requestKey),
        7,
      ).map((slide) => slide.id),
    ).toEqual(["empty", "fallback"]);
  });

  it("accepts only the latest automatic or manual request result", () => {
    expect(isLatestMediaRequestVersion(1, 2)).toBe(false);
    expect(isLatestMediaRequestVersion(2, 2)).toBe(true);
  });

  it("never persists a local or provider fallback as resolved media", () => {
    expect(
      shouldPersistResolvedMedia({ url: fallbackUrl, source: "fallback" }),
    ).toBe(false);
    expect(
      shouldPersistResolvedMedia({
        url: "https://cdn.example/real.webp",
        source: "pexels",
      }),
    ).toBe(true);
  });
});
