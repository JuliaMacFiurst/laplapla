import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  boxesNearWithWrap, colorDistance, colorGraph, dilatePeriodicX, shortHash,
  validateGraph, type Graph,
} from "@/tools/physicMapColorCore";

describe("offline physical map color core", () => {
  it("uses a repeatable geometry hash", () => {
    expect(shortHash("M 1 2 Z")).toBe(createHash("sha256").update("M 1 2 Z").digest("hex").slice(0, 12));
    expect(shortHash("M 1 2 Z")).not.toBe(shortHash("M 1 3 Z"));
  });

  it("detects near boxes across the horizontal map seam", () => {
    const left = { x: 0, y: 100, width: 2, height: 2 };
    const right = { x: 797, y: 100, width: 2, height: 2 };
    expect(boxesNearWithWrap(left, right, 2, 800)).toBe(true);
    expect(boxesNearWithWrap(left, { ...right, y: 120 }, 2, 800)).toBe(false);
    expect(boxesNearWithWrap(left, { ...right, x: 700 }, 2, 800)).toBe(false);
  });

  it("dilates filled pixels across x but never across y", () => {
    const binary = new Uint8Array(6 * 5);
    binary[2 * 6] = 255;
    const expanded = dilatePeriodicX(binary, 6, 5, 1);
    expect(expanded[2 * 6 + 5]).toBe(255);
    expect(expanded[1 * 6 + 5]).toBe(255);
    expect(expanded[0 * 6 + 5]).toBe(0);
  });

  it("uses perceptual color distance", () => {
    expect(colorDistance("#E9CD91", "#E9CD91")).toBe(0);
    expect(colorDistance("#E9CD91", "#FFF2CB")).toBeCloseTo(colorDistance("#FFF2CB", "#E9CD91"));
    expect(colorDistance("#E9CD91", "#FFF2CB")).toBeGreaterThan(0);
  });

  it("colors a triangle deterministically regardless of map insertion order", () => {
    const makeGraph = (keys: string[]): Graph => new Map(keys.map((key) => [key, new Set(keys.filter((other) => other !== key))]));
    const first = makeGraph(["c", "a", "b"]);
    const second = makeGraph(["b", "c", "a"]);
    validateGraph(first);
    const palette = ["#FFF2CB", "#D7B078", "#DDA982"];
    const a = colorGraph(first, palette, 0.055);
    const b = colorGraph(second, palette, 0.055);
    expect([...a].sort()).toEqual([...b].sort());
    expect(new Set(a.values()).size).toBe(3);
  });

  it("rejects asymmetric neighbor references", () => {
    expect(() => validateGraph(new Map([["a", new Set(["b"])], ["b", new Set()]]))).toThrow(/Asymmetric/);
  });
});
