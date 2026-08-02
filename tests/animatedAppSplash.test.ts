import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getStaticSplashReason,
  shouldSkipAnimatedSplash,
} from "@/components/PWA/AnimatedAppSplash";
import { getSplashDebugMode, getSplashTraceEnabled } from "@/components/PWA/PWAAppShell";

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

  it("keeps the in-flight SVG eligible after the diagnostic timeout", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/PWA/AnimatedAppSplash.tsx"),
      "utf8",
    );
    expect(source).toContain("Keep the in-flight object alive");
    expect(source).toContain("onError={keepStaticFallback}");
    expect(source).not.toContain("svgTimedOut.current");
  });

  it("starts the embedded CSS clock at the visible handoff", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/PWA/AnimatedAppSplash.tsx"),
      "utf8",
    );
    expect(source).toContain('classList.add("splash-running")');
  });

  it("returns testable static reasons", () => {
    expect(getStaticSplashReason(true)).toBe("reduced-motion");
    expect(getStaticSplashReason(false, { saveData: true })).toBe("saveData");
    expect(getStaticSplashReason(false, { effectiveType: "2g" })).toBe("slow-connection");
  });

  it("only enables query debug modes on development or preview hosts", () => {
    for (const mode of ["animated", "static", "slow", "timeout", "error"] as const) {
      expect(getSplashDebugMode(`?debugSplashMode=${mode}`, "example.vercel.app")).toBe(mode);
    }
    expect(getSplashDebugMode("?debugSplashMode=error", "www.laplapla.com")).toBeUndefined();
    expect(getSplashDebugMode("?debugSplash=1", "localhost")).toBe("animated");
  });

  it("only enables the visual trace badge on preview hosts", () => {
    expect(getSplashTraceEnabled("?debugSplashTrace=1", "example.vercel.app")).toBe(true);
    expect(getSplashTraceEnabled("?debugSplashTrace=1", "www.laplapla.com")).toBe(false);
  });
});
