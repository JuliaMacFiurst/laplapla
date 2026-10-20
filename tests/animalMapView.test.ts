import { describe, expect, it } from "vitest";
import {
  getAnimalMobileDoubleTapZoom,
  getAnimalMobilePositionAfterZoom,
  getAnimalMobilePanBounds,
  getAnimalMobileResetPosition,
  getAnimalMobileSafeView,
  getMissingAnimalViewBox,
} from "@/lib/animalMapView";

describe("animal map fitted view", () => {
  it("derives the missing viewBox from intrinsic biomes SVG dimensions", () => {
    expect(getMissingAnimalViewBox(null, "1119.2252", "607.64288"))
      .toBe("0 0 1119.2252 607.64288");
    expect(getMissingAnimalViewBox("0 0 100 50", "1119", "608")).toBeNull();
    expect(getMissingAnimalViewBox(null, "100%", "608")).toBeNull();
  });

  it("keeps the full CSS-sized SVG in view and centers a smaller viewport", () => {
    expect(getAnimalMobileSafeView({
      viewportWidth: 390, viewportHeight: 698,
      contentWidth: 390, contentHeight: 698,
    })).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(getAnimalMobileSafeView({
      viewportWidth: 320, viewportHeight: 500,
      contentWidth: 390, contentHeight: 698,
    }).zoom).toBeCloseTo(500 / 698);
  });

  it("returns the fitted view after a pan reaches minimum zoom", () => {
    const safe = getAnimalMobileSafeView({
      viewportWidth: 390, viewportHeight: 698,
      contentWidth: 390, contentHeight: 698,
    });
    expect(getAnimalMobileResetPosition(safe, 1)).toEqual({ x: 0, y: 0 });
    expect(getAnimalMobileResetPosition(safe, 1.000001)).toBeNull();
  });

  it("keeps the zoom anchor stable and lets double tap reach the animal maximum", () => {
    const position = getAnimalMobilePositionAfterZoom(
      { x: -50, y: -25 }, 2, 4, { x: 195, y: 349 },
    );
    expect(position).toEqual({ x: -295, y: -399 });
    expect(getAnimalMobileDoubleTapZoom(2, 1, 192)).toBe(3.2);
    expect(getAnimalMobileDoubleTapZoom(150, 1, 192)).toBe(192);
    expect(getAnimalMobileDoubleTapZoom(192, 1, 192)).toBe(1);
  });

  it("lets every fitted-world edge reach the center without panning into letterbox space", () => {
    const params = {
      viewportWidth: 390, viewportHeight: 698,
      contentWidth: 390, contentHeight: 698,
      viewBoxWidth: 1119.2252, viewBoxHeight: 607.64288,
    };
    expect(getAnimalMobilePanBounds({ ...params, zoom: 1 }))
      .toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    const bounds = getAnimalMobilePanBounds({ ...params, zoom: 192 });
    const fittedHeight = params.viewBoxHeight * params.contentWidth / params.viewBoxWidth;
    const top = (params.contentHeight - fittedHeight) / 2;
    expect(bounds.maxX).toBeCloseTo(195);
    expect(bounds.minX + 390 * 192).toBeCloseTo(195);
    expect(bounds.maxY + top * 192).toBeCloseTo(349);
    expect(bounds.minY + (top + fittedHeight) * 192).toBeCloseTo(349);
  });
});
