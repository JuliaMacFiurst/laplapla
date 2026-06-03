import { describe, expect, it } from "vitest";
import {
  buildShortSlideMediaQuery,
  extractSlideConcepts,
  mapWithConcurrency,
} from "../lib/media/slideMedia";

describe("slide media queries", () => {
  it("prefers generated keywords over slide prose", () => {
    expect(buildShortSlideMediaQuery(
      "capybara",
      "They walked through a mysterious place and found something surprising.",
      ["castle"],
    )).toBe("capybara castle");
  });

  it("does not search by the full sentence or first filler words", () => {
    expect(buildShortSlideMediaQuery(
      "cat",
      "Why entropy forbids us to live forever",
    )).toBe("cat entropy live");
  });

  it("keeps at most two semantic concepts plus the section prefix", () => {
    expect(extractSlideConcepts("Как работает мозг и почему он запоминает музыку")).toEqual([
      "мозг",
      "музыку",
    ]);
  });
});

describe("mapWithConcurrency", () => {
  it("keeps result order while limiting active work", async () => {
    let active = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
