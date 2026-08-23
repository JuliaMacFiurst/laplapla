import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapPuzzleClientPoint } from "@/components/Dogs/Puzzle/PuzzleCanvas";
import {
  clampPuzzleGroupDelta,
  getPuzzleGroupBounds,
  getPuzzleMinimumVisible,
} from "@/lib/puzzleDragBounds";

const lessonSource = readFileSync("pages/dog/lessons/[slug].tsx", "utf8");
const puzzleSource = readFileSync("components/Dogs/Puzzle/PuzzleCanvas.tsx", "utf8");
const lessonCss = readFileSync("styles/DogLessons.css", "utf8");

describe("mobile dog lesson puzzle geometry", () => {
  const piece = (x: number, y: number, width = 100, height = 80) => ({
    x,
    y,
    canvas: { width, height },
  });

  it("keeps a single piece partially visible at every board edge", () => {
    const board = { width: 512, height: 512 };
    const visible = { x: 32, y: 32 };
    const current = piece(200, 200);
    expect(clampPuzzleGroupDelta([current], { dx: -999, dy: -999 }, board, visible)).toEqual({ dx: -268, dy: -248 });
    expect(clampPuzzleGroupDelta([current], { dx: 999, dy: 999 }, board, visible)).toEqual({ dx: 280, dy: 280 });
  });

  it("clamps a connected group by the complete group bounds", () => {
    const group = [piece(40, 50), piece(140, 130, 120, 90)];
    const delta = clampPuzzleGroupDelta(group, { dx: -500, dy: 500 }, { width: 512, height: 512 }, { x: 30, y: 30 });
    expect(delta).toEqual({ dx: -230, dy: 432 });
    const moved = group.map((item) => ({ ...item, x: item.x + delta.dx, y: item.y + delta.dy }));
    const bounds = getPuzzleGroupBounds(moved);
    expect(bounds.maxX).toBe(30);
    expect(bounds.minY).toBe(482);
    expect(bounds.maxY).toBeGreaterThanOrEqual(30);
  });

  it("converts the minimum selectable strip from CSS pixels to logical coordinates", () => {
    expect(getPuzzleMinimumVisible({ width: 512, height: 512 }, { width: 256, height: 256 }, 28)).toEqual({ x: 56, y: 56 });
  });
  it("keeps the PuzzleCanvas intrinsic coordinate space at 512 square", () => {
    expect(puzzleSource).toContain("width={512}");
    expect(puzzleSource).toContain("height={512}");
  });

  it("maps center and all rendered square corners to logical coordinates", () => {
    const rect = { left: 10, top: 20, width: 340, height: 340 };
    const size = { width: 512, height: 512 };
    expect(mapPuzzleClientPoint(180, 190, rect, size)).toEqual({ x: 256, y: 256 });
    expect(mapPuzzleClientPoint(10, 20, rect, size)).toEqual({ x: 0, y: 0 });
    expect(mapPuzzleClientPoint(350, 20, rect, size)).toEqual({ x: 512, y: 0 });
    expect(mapPuzzleClientPoint(10, 360, rect, size)).toEqual({ x: 0, y: 512 });
    expect(mapPuzzleClientPoint(350, 360, rect, size)).toEqual({ x: 512, y: 512 });
  });

  it("uses one square box for mobile mode, board, wrapper, and canvas", () => {
    expect(lessonCss).toMatch(/\.lesson-puzzle-board-mobile\s*\{[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;[\s\S]*aspect-ratio:\s*1 \/ 1/);
    expect(lessonCss).toMatch(/\.lesson-puzzle-board-mobile \.lesson-puzzle-wrapper,[\s\S]*aspect-ratio:\s*1 \/ 1/);
    expect(lessonCss).not.toMatch(/\.lesson-puzzle-board-mobile\s*\{[\s\S]{0,400}width:\s*calc\(100% - 8px\)/);
    expect(lessonCss).not.toMatch(/\.lesson-puzzle-board-mobile\s*\{[\s\S]{0,400}height:\s*calc\(100% - 38px\)/);
    expect(lessonCss).not.toMatch(/\.lesson-puzzle-board-mobile canvas\s*\{[^}]*object-fit:\s*contain/);
  });

  it("keeps puzzle above artwork and independent from drawing zoom", () => {
    expect(lessonCss).toMatch(/\.lesson-puzzle-mode-mobile\s*\{[\s\S]*z-index:\s*20/);
    expect(lessonSource).toContain('animationMode === "puzzle" ? "lesson-mobile-shell--puzzle"');
    expect(lessonSource).toContain("setMobileCanvasViewport({ scale: 1, x: 0, y: 0 })");
    const puzzleMarkup = lessonSource.slice(
      lessonSource.indexOf('data-testid="dog-lesson-mobile-puzzle-mode"'),
      lessonSource.indexOf('animationMode === "replay"'),
    );
    expect(puzzleMarkup).not.toContain("mobileArtworkStageRef");
    expect(puzzleMarkup).not.toContain("mobileCanvasViewport.scale");
  });

  it("restores drawing UI after closing the independent puzzle mode", () => {
    expect(lessonSource).toContain("const closeMagicMode = () =>");
    expect(lessonSource).toContain("setAnimationMode(null)");
    expect(lessonSource).toContain('onClick={closeMagicMode}');
  });

  it("keeps portrait tray horizontally scrollable and gives landscape its vertical layout", () => {
    expect(lessonCss).toMatch(/\.lesson-puzzle-tray-inner-mobile-active\s*\{[\s\S]*overflow-x:\s*auto;[\s\S]*touch-action:\s*pan-x/);
    expect(lessonCss).toMatch(/@media \(min-width: 768px\) and \(orientation: landscape\)[\s\S]*\.lesson-puzzle-tray-inner-mobile-active\s*\{[\s\S]*overflow-y:\s*auto/);
  });

  it("uses a puzzle-specific landscape budget instead of the drawing budget", () => {
    expect(lessonCss).toMatch(/\.lesson-mobile-shell--puzzle \.lesson-mobile-workspace\s*\{[\s\S]*calc\(var\(--app-viewport-height, 100dvh\) - 24px\)/);
  });
});
