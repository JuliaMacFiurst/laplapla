import { describe, expect, it } from "vitest";
import {
  clampMobileZoom,
  clampMobilePanPosition,
  getMobileMaxZoom,
  getMobilePanBounds,
  getMobilePhysicPanBounds,
  getMobilePhysicPositionAfterZoom,
  getMobilePhysicDoubleTapZoom,
  type RaccoonMapType,
} from "@/lib/raccoonMapZoom";

describe("raccoon mobile map zoom", () => {
  it.each(["country", "sea", "flag", "culture", "food"] as RaccoonMapType[])(
    "gives polygon map %s twice the previous maximum zoom",
    (type) => {
      expect(getMobileMaxZoom(type)).toBe(16);
    },
  );

  it.each(["weather"] as RaccoonMapType[])(
    "keeps heavy map %s on a lower deep-zoom limit",
    (type) => {
      expect(getMobileMaxZoom(type)).toBe(12);
    },
  );

  it("allows only the physic map to reach the measured tiny-island zoom", () => {
    expect(getMobileMaxZoom("physic")).toBe(128);
    expect(clampMobileZoom(200, 0.8, getMobileMaxZoom("physic"))).toBe(128);
    expect(getMobileMaxZoom("river")).toBe(12);
    expect(getMobileMaxZoom("country")).toBe(16);
  });

  it("gives Animals/Biomes its own higher mobile limit", () => {
    expect(getMobileMaxZoom("animal")).toBe(192);
    expect(getMobileMaxZoom("physic")).toBe(128);
    expect(getMobileMaxZoom("river")).toBe(12);
    expect(getMobileMaxZoom("sea")).toBe(16);
    expect(getMobileMaxZoom("weather")).toBe(12);
  });

  it("keeps the full animal SVG reachable at its new deep zoom", () => {
    const bounds = getMobilePanBounds({
      viewportWidth: 390, viewportHeight: 698,
      contentWidth: 390, contentHeight: 698, zoom: 192,
    });
    expect(bounds).toEqual({ minX: -74490, maxX: 0, minY: -133318, maxY: 0 });
    expect(clampMobilePanPosition(-1e6, 1e6, bounds))
      .toEqual({ x: bounds.minX, y: bounds.maxY });
  });

  it("keeps the viewport center fixed while physic zoom changes", () => {
    const anchor = { x: 195, y: 400 };
    const zoomed = getMobilePhysicPositionAfterZoom({ x: 0, y: 0 }, 1, 128, anchor);
    expect(zoomed).toEqual({ x: -24765, y: -50800 });
    expect(getMobilePhysicPositionAfterZoom(zoomed, 128, 1, anchor))
      .toEqual({ x: 0, y: 0 });
  });

  it("lets either physic edge reach the viewport center at deep zoom", () => {
    const bounds = getMobilePhysicPanBounds({
      viewportWidth: 390, viewportHeight: 800,
      contentWidth: 390, contentHeight: 800, zoom: 128,
    });
    expect(bounds).toEqual({ minX: -49725, maxX: 195, minY: -102000, maxY: 400 });
    expect(bounds.maxX).toBe(390 / 2);
    expect(bounds.minX + 390 * 128).toBe(390 / 2);
    expect(bounds.maxY).toBe(800 / 2);
    expect(bounds.minY + 800 * 128).toBe(800 / 2);
    expect(getMobilePhysicPanBounds({
      viewportWidth: 390, viewportHeight: 800,
      contentWidth: 390, contentHeight: 800, zoom: 1,
    })).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  });

  it("keeps physic double-tap zooming beyond 2 and resets only at max", () => {
    expect(getMobilePhysicDoubleTapZoom(2, 0.8, 128)).toBe(3.2);
    expect(getMobilePhysicDoubleTapZoom(100, 0.8, 128)).toBe(128);
    expect(getMobilePhysicDoubleTapZoom(128, 0.8, 128)).toBe(0.8);
  });

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
