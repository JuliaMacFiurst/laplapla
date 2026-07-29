import { describe, expect, it } from "vitest";
import { selectSmallestSvgHit } from "@/lib/mapSvgInteraction";

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
