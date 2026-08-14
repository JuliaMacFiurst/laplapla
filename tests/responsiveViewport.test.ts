import { describe, expect, it } from "vitest";
import { classifyResponsiveViewport } from "@/hooks/useResponsiveViewport";

describe("responsive viewport classification", () => {
  it("keeps a normal wide fine-pointer desktop on the desktop layout", () => {
    const result = classifyResponsiveViewport({
      width: 1440,
      height: 900,
      isCoarsePointer: false,
      isNoHover: false,
    });

    expect(result).toMatchObject({
      usesTouchPrimaryInput: false,
      deviceClass: "desktop",
    });
  });

  it("classifies a normal narrow coarse-pointer phone as mobile", () => {
    const result = classifyResponsiveViewport({
      width: 390,
      height: 844,
      isCoarsePointer: true,
      isNoHover: true,
    });

    expect(result).toMatchObject({
      usesTouchPrimaryInput: true,
      deviceClass: "mobile",
    });
  });

  it("classifies the Samsung-like coarse-pointer and hover runtime as mobile", () => {
    const samsungInstalledAppRuntime = {
      width: 384,
      height: 694,
      isCoarsePointer: true,
      isNoHover: false,
      pointerFine: false,
      hoverHover: true,
      navigatorMobile: true,
    };

    const result = classifyResponsiveViewport(samsungInstalledAppRuntime);

    expect(result).toMatchObject({
      usesTouchPrimaryInput: true,
      shortestSide: 384,
      widestSide: 694,
      deviceClass: "mobile",
    });
    expect(result.deviceClass !== "desktop").toBe(true); // usesTouchStudioLayout
  });

  it("preserves desktop layout for a narrow fine-pointer desktop window", () => {
    const result = classifyResponsiveViewport({
      width: 600,
      height: 800,
      isCoarsePointer: false,
      isNoHover: false,
    });

    expect(result).toMatchObject({
      usesTouchPrimaryInput: false,
      deviceClass: "desktop",
    });
  });
});
