import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { shouldSkipAnimatedSplash } from "@/components/PWA/AnimatedAppSplash";

describe("AnimatedAppSplash loading policy", () => {
  it.each([
    [true, undefined],
    [false, { saveData: true }],
    [false, { effectiveType: "slow-2g" }],
    [false, { effectiveType: "2g" }],
  ])("does not mount the SVG for reduced or constrained connections", (reduced, connection) => {
    expect(shouldSkipAnimatedSplash(reduced, connection)).toBe(true);
  });

  it("allows animation when connection information is absent or sufficiently fast", () => {
    expect(shouldSkipAnimatedSplash(false)).toBe(false);
    expect(shouldSkipAnimatedSplash(false, { effectiveType: "3g" })).toBe(false);
    expect(shouldSkipAnimatedSplash(false, { effectiveType: "4g" })).toBe(false);
  });

  it("keeps the static layer through load errors and the bounded timeout", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/PWA/AnimatedAppSplash.tsx"),
      "utf8",
    );
    expect(source).toContain("svgTimedOut.current = true");
    expect(source).toContain("setSvgVisible(false)");
    expect(source).toContain("onError={keepStaticFallback}");
    expect(source).toContain("if (svgTimedOut.current)");
  });
});
