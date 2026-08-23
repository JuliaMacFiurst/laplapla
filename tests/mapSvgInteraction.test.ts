import { describe, expect, it } from "vitest";
import {
  getMobileTouchTolerance,
  getRadialTouchSampleOffsets,
  isMobileTouchTapEligible,
  selectMobileProximityTarget,
  selectMobileTouchTarget,
  selectFirstInteractiveViewportHit,
  selectSmallestSvgHit,
} from "@/lib/mapSvgInteraction";

describe("mobile SVG touch tolerance", () => {
  it("always gives an exact SVG hit priority", () => {
    const exact = { id: "exact" };
    const nearby = { id: "nearby" };
    expect(
      selectMobileTouchTarget(
        exact,
        [{ target: nearby, distance: 8, area: 1 }],
        20,
      ),
    ).toBe(exact);
  });

  it("is enabled only for explicitly configured polygon maps", () => {
    for (const type of ["country", "sea", "flag", "culture", "food"] as const) {
      expect(getMobileTouchTolerance(type)).toBe(20);
    }
    for (const type of ["river", "physic", "weather", "animal"] as const) {
      expect(getMobileTouchTolerance(type)).toBe(0);
    }
  });

  it("samples real browser hit points within the CSS-pixel radius", () => {
    const offsets = getRadialTouchSampleOffsets(20);
    expect(offsets).toHaveLength(24);
    expect(Math.max(...offsets.map((offset) => offset.distance))).toBe(20);
  });

  it("selects a nearby target and rejects one outside tolerance", () => {
    const luxembourg = { id: "luxembourg" };
    expect(
      selectMobileProximityTarget(
        [{ target: luxembourg, distance: 14, area: 12 }],
        20,
      ),
    ).toBe(luxembourg);
    expect(
      selectMobileProximityTarget(
        [{ target: luxembourg, distance: 21, area: 12 }],
        20,
      ),
    ).toBeNull();
  });

  it("prefers the nearest geometry hit", () => {
    const near = { id: "near" };
    const far = { id: "far" };
    expect(
      selectMobileProximityTarget(
        [
          { target: far, distance: 20, area: 5 },
          { target: near, distance: 8, area: 500 },
        ],
        20,
      ),
    ).toBe(near);
  });

  it("uses smaller target area to break practically equal distance ties", () => {
    const largeCountry = { id: "large" };
    const tinyCountry = { id: "tiny" };
    expect(
      selectMobileProximityTarget(
        [
          { target: largeCountry, distance: 8, area: 5000 },
          { target: tinyCountry, distance: 9.5, area: 10 },
        ],
        20,
      ),
    ).toBe(tinyCountry);
  });

  it("allows proximity only for a stationary mobile tap", () => {
    expect(
      isMobileTouchTapEligible({
        isMobile: true,
        moved: false,
        pinching: false,
      }),
    ).toBe(true);
    expect(
      isMobileTouchTapEligible({
        isMobile: true,
        moved: true,
        pinching: false,
      }),
    ).toBe(false);
    expect(
      isMobileTouchTapEligible({
        isMobile: true,
        moved: false,
        pinching: true,
      }),
    ).toBe(false);
    expect(
      isMobileTouchTapEligible({
        isMobile: false,
        moved: false,
        pinching: false,
      }),
    ).toBe(false);
  });
});

describe("SVG map hit ordering", () => {
  it("prefers a smaller interactive region over an overlapping large layer", () => {
    const large = { id: "continent", width: 900, height: 500 };
    const small = { id: "mountain", width: 40, height: 25 };

    expect(
      selectSmallestSvgHit([large, small], (item) => item),
    ).toBe(small);
  });

  it("keeps the large region available when it is the only hit", () => {
    const large = { id: "continent", width: 900, height: 500 };

    expect(
      selectSmallestSvgHit([large], (item) => item),
    ).toBe(large);
  });

  it("returns null when no painted region contains the pointer", () => {
    expect(selectSmallestSvgHit([], () => ({ width: 0, height: 0 }))).toBeNull();
  });
});

describe("biome viewport hit ordering", () => {
  it("uses the topmost interactive path returned by the browser", () => {
    const biomeUnderPointer = { id: "biome-under-pointer" };
    const biomeAboveCursor = { id: "biome-above-cursor" };
    const stack = [
      { path: null },
      { path: biomeUnderPointer },
      { path: biomeAboveCursor },
    ];

    expect(
      selectFirstInteractiveViewportHit(
        stack,
        (element) => element.path,
        () => true,
      ),
    ).toBe(biomeUnderPointer);
  });

  it("ignores decorative overlay hits", () => {
    const overlay = { id: "highlight", overlay: true };
    const biome = { id: "forest", overlay: false };

    expect(
      selectFirstInteractiveViewportHit(
        [{ path: overlay }, { path: biome }],
        (element) => element.path,
        (path) => !path.overlay,
      ),
    ).toBe(biome);
  });

  it("does not depend on container offsets, zoom, or pan values", () => {
    const biome = { id: "desert" };
    const browserHitStack = [{ path: biome }];

    for (const _layout of [
      { top: 0, zoom: 1, panY: 0 },
      { top: 420, zoom: 1.5, panY: -180 },
      { top: 120, zoom: 0.7, panY: 240 },
    ]) {
      expect(
        selectFirstInteractiveViewportHit(
          browserHitStack,
          (element) => element.path,
          () => true,
        ),
      ).toBe(biome);
    }
  });
});
