import { describe, expect, it } from "vitest";
import {
  DOG_LESSON_MAX_SCALE,
  clampCanvasViewport,
  clampViewportScale,
  mapClientPointToCanvas,
  updateViewportFromPinch,
} from "@/lib/dogLessonMobileViewport";

const viewport = { width: 320, height: 320 };
const stage = { width: 320, height: 320 };

describe("dog lesson mobile canvas viewport", () => {
  it("starts and resets at the fitted view", () => {
    expect(clampCanvasViewport({ scale: 1, x: 100, y: -100 }, viewport, stage))
      .toEqual({ scale: 1, x: 0, y: 0 });
  });

  it("clamps deep zoom and invalid numbers", () => {
    expect(clampViewportScale(99)).toBe(DOG_LESSON_MAX_SCALE);
    expect(clampViewportScale(0.2)).toBe(1);
    expect(clampViewportScale(Number.NaN)).toBe(1);
    expect(clampCanvasViewport({ scale: 2, x: Number.NaN, y: Infinity }, viewport, stage))
      .toEqual({ scale: 2, x: 0, y: 0 });
  });

  it("keeps the pinch center anchored while zooming", () => {
    expect(updateViewportFromPinch({
      initial: { scale: 1, x: 0, y: 0 },
      initialDistance: 100,
      initialCenter: { x: 160, y: 160 },
      distance: 200,
      center: { x: 160, y: 160 },
      viewport,
      stage,
    })).toEqual({ scale: 2, x: -160, y: -160 });
  });

  it("supports two-finger pan and keeps a meaningful canvas portion visible", () => {
    const result = updateViewportFromPinch({
      initial: { scale: 2, x: -160, y: -160 },
      initialDistance: 100,
      initialCenter: { x: 160, y: 160 },
      distance: 100,
      center: { x: 10000, y: -10000 },
      viewport,
      stage,
    });
    expect(result).toEqual({ scale: 2, x: 240, y: -560 });
  });

  it("maps logical drawing coordinates at scale 1, zoom, and zoom plus pan", () => {
    expect(mapClientPointToCanvas({ x: 160, y: 160 }, { left: 0, top: 0, width: 320, height: 320 }, { width: 512, height: 512 }))
      .toEqual({ x: 256, y: 256 });
    expect(mapClientPointToCanvas({ x: 160, y: 160 }, { left: -160, top: -160, width: 640, height: 640 }, { width: 512, height: 512 }))
      .toEqual({ x: 256, y: 256 });
    expect(mapClientPointToCanvas({ x: 100, y: 140 }, { left: -220, top: -180, width: 640, height: 640 }, { width: 512, height: 512 }))
      .toEqual({ x: 256, y: 256 });
  });

  it("maps the visible bottom edge inside the logical drawing surface", () => {
    const point = mapClientPointToCanvas(
      { x: 160, y: 310 },
      { left: 0, top: 0, width: 320, height: 320 },
      { width: 512, height: 512 },
    );
    expect(point.x).toBe(256);
    expect(point.y).toBe(496);
    expect(point.y).toBeLessThan(512);
  });
});
