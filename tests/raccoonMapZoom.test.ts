import { describe, expect, it } from "vitest";
import {
  clampMobileZoom,
  clampMobilePanPosition,
  getMobileMaxZoom,
  getMobilePanBounds,
  type RaccoonMapType,
} from "@/lib/raccoonMapZoom";

describe("raccoon mobile map zoom", () => {
  it.each(["country", "sea", "flag", "culture", "food"] as RaccoonMapType[])(
    "gives polygon map %s twice the previous maximum zoom",
    (type) => {
      expect(getMobileMaxZoom(type)).toBe(16);
    },
  );

  it.each(["physic", "animal", "weather"] as RaccoonMapType[])(
    "keeps heavy map %s on a lower deep-zoom limit",
    (type) => {
      expect(getMobileMaxZoom(type)).toBe(12);
    },
  );

  it("keeps the existing mobile minimum unchanged", () => {
    expect(clampMobileZoom(0.2, 0.8, 16)).toBe(0.8);
  });

  it("keeps the heavier stroke-only river map on its explicit limit", () => {
    expect(getMobileMaxZoom("river")).toBe(12);
  });

  it("clamps zoom to both the configured maximum and fitted minimum", () => {
    expect(clampMobileZoom(20, 0.8, 16)).toBe(16);
    expect(clampMobileZoom(0.2, 0.8, 16)).toBe(0.8);
    expect(clampMobileZoom(3.5, 0.8, 16)).toBe(3.5);
  });

  it("turns invalid pinch results into a finite safe zoom", () => {
    expect(clampMobileZoom(Number.NaN, 0.72, 8)).toBe(0.72);
    expect(clampMobileZoom(Number.POSITIVE_INFINITY, 0.72, 8)).toBe(0.72);
  });

  it("keeps pan bounds valid at the new maximum zoom", () => {
    expect(
      getMobilePanBounds({
        viewportWidth: 390,
        viewportHeight: 700,
        contentWidth: 390,
        contentHeight: 700,
        zoom: 16,
      }),
    ).toEqual({ minX: -5850, maxX: 0, minY: -10500, maxY: 0 });
  });

  it("hard-clamps extreme pan so content cannot disappear off-screen", () => {
    const bounds = getMobilePanBounds({
      viewportWidth: 390,
      viewportHeight: 700,
      contentWidth: 390,
      contentHeight: 700,
      zoom: 16,
    });
    expect(clampMobilePanPosition(-100000, 100000, bounds)).toEqual({
      x: bounds.minX,
      y: bounds.maxY,
    });
  });

  it("centers an axis when fitted content is smaller than the viewport", () => {
    expect(
      getMobilePanBounds({
        viewportWidth: 390,
        viewportHeight: 700,
        contentWidth: 300,
        contentHeight: 400,
        zoom: 1,
      }),
    ).toEqual({ minX: 45, maxX: 45, minY: 150, maxY: 150 });
  });
});
