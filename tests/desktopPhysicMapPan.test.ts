import { describe, expect, it } from "vitest";
import {
  clampDesktopPhysicMapPosition,
  getDesktopPhysicPositionAfterZoomOut,
  type DesktopPhysicMapGeometry,
} from "@/lib/desktopPhysicMapPan";
import { getMobileTouchTolerance } from "@/lib/mapSvgInteraction";

// Measured from the desktop physic map: 1208 × 469 viewport, 966 × 469 SVG.
const geometry: DesktopPhysicMapGeometry = {
  viewportWidth: 1208,
  viewportHeight: 469,
  svgLeft: 121,
  svgTop: 0,
  svgWidth: 966,
  svgHeight: 469,
};

function visibleDimensions(position: { x: number; y: number }, zoom: number) {
  const left = position.x + geometry.svgLeft * zoom;
  const top = position.y + geometry.svgTop * zoom;
  return {
    width: Math.max(0, Math.min(geometry.viewportWidth, left + geometry.svgWidth * zoom) - Math.max(0, left)),
    height: Math.max(0, Math.min(geometry.viewportHeight, top + geometry.svgHeight * zoom) - Math.max(0, top)),
  };
}

describe("desktop physic map zoom and pan", () => {
  it("keeps the SVG visible after zooming out from a far-right pan", () => {
    const position = getDesktopPhysicPositionAfterZoomOut({ x: 2500, y: 0 }, 4, 3, geometry);
    expect(visibleDimensions(position, 3).width).toBeGreaterThanOrEqual(geometry.viewportWidth * 0.2);
  });

  it("keeps the SVG visible after zooming out from a far-left pan", () => {
    const position = getDesktopPhysicPositionAfterZoomOut({ x: -2790, y: 0 }, 4, 3, geometry);
    expect(visibleDimensions(position, 3).width).toBeGreaterThanOrEqual(geometry.viewportWidth * 0.2);
  });

  it("keeps the SVG visible after upward and downward pans", () => {
    for (const y of [-2000, 2000]) {
      const position = getDesktopPhysicPositionAfterZoomOut({ x: 0, y }, 4, 3, geometry);
      expect(visibleDimensions(position, 3).height).toBeGreaterThanOrEqual(geometry.viewportHeight * 0.2 - 1e-9);
    }
  });

  it("cannot lose the map over repeated zoom-outs after a maximum-zoom pan", () => {
    let zoom = 4;
    let position = clampDesktopPhysicMapPosition({ x: -2790, y: -1400 }, zoom, geometry);
    for (let step = 0; step < 9; step++) {
      const nextZoom = Math.max(zoom / 1.2, 1);
      position = getDesktopPhysicPositionAfterZoomOut(position, zoom, nextZoom, geometry);
      zoom = nextZoom;
      expect(visibleDimensions(position, zoom).width).toBeGreaterThanOrEqual(geometry.viewportWidth * 0.2 - 1e-9);
      expect(visibleDimensions(position, zoom).height).toBeGreaterThanOrEqual(geometry.viewportHeight * 0.2 - 1e-9);
    }
    expect(zoom).toBe(1);
  });

  it("centers the SVG at minimum zoom even from an invalid pan", () => {
    const position = getDesktopPhysicPositionAfterZoomOut({ x: -2790, y: 1800 }, 1.2, 1, geometry);
    expect(position.x).toBeCloseTo(0);
    expect(position.y).toBeCloseTo(0);
    expect(visibleDimensions(position, 1)).toEqual({ width: 966, height: 469 });
  });

  it("preserves the viewport-center world point while the pan remains valid", () => {
    const position = getDesktopPhysicPositionAfterZoomOut({ x: -250, y: -80 }, 2, 1.5, geometry);
    expect(position.x).toBeCloseTo(604 - (604 + 250) * 0.75);
    expect(position.y).toBeCloseTo(234.5 - (234.5 + 80) * 0.75);
  });

  it("leaves physic mobile proximity behavior at zero", () => {
    expect(getMobileTouchTolerance("physic")).toBe(0);
  });
});

describe("desktop Animals/Biomes bounds", () => {
  const animalGeometry: DesktopPhysicMapGeometry = {
    viewportWidth: 1248,
    viewportHeight: 612,
    svgLeft: 0,
    svgTop: 0,
    svgWidth: 1119,
    svgHeight: 608,
  };

  it("never lets a large animal-map drag hide the entire SVG", () => {
    for (const position of [
      { x: -10000, y: -10000 },
      { x: 10000, y: 10000 },
    ]) {
      const clamped = clampDesktopPhysicMapPosition(position, 4, animalGeometry);
      const left = clamped.x;
      const top = clamped.y;
      const visibleWidth = Math.min(animalGeometry.viewportWidth, left + animalGeometry.svgWidth * 4) - Math.max(0, left);
      const visibleHeight = Math.min(animalGeometry.viewportHeight, top + animalGeometry.svgHeight * 4) - Math.max(0, top);
      expect(visibleWidth).toBeGreaterThanOrEqual(animalGeometry.viewportWidth * 0.2 - 1e-9);
      expect(visibleHeight).toBeGreaterThanOrEqual(animalGeometry.viewportHeight * 0.2 - 1e-9);
    }
  });

  it("returns a far-panned animal map to a valid centered minimum", () => {
    const position = getDesktopPhysicPositionAfterZoomOut(
      { x: -10000, y: 10000 }, 4, 1, animalGeometry,
    );
    expect(position.x).toBeCloseTo((1248 - 1119) / 2);
    expect(position.y).toBeCloseTo((612 - 608) / 2);
  });
});
