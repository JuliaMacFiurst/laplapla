import { describe, expect, it } from "vitest";
import {
  selectFirstInteractiveViewportHit,
  selectSmallestSvgHit,
} from "@/lib/mapSvgInteraction";

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
