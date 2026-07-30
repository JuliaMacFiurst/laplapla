import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import pwaConfig from "@/config/pwa.json";

type GeneratedAsset = {
  platform: "android" | "web";
  density: string;
  path: string;
  width: number;
  height: number;
  logoWidth: number;
  logoHeight: number;
  logoCenterX: number;
  logoCenterY: number;
};

type SplashReport = {
  source: string;
  generated: GeneratedAsset[];
};

const root = process.cwd();
const generatedRoot = path.join(root, "public/pwa/splash/generated");
const report = JSON.parse(
  fs.readFileSync(path.join(generatedRoot, "splash-assets.json"), "utf8"),
) as SplashReport;

describe("generated splash assets", () => {
  it("uses the configured master and creates every Android density", () => {
    expect(report.source).toBe(pwaConfig.splashMasterPath);
    expect(
      report.generated
        .filter((asset) => asset.platform === "android")
        .map((asset) => [asset.density, asset.width]),
    ).toEqual([
      ["mdpi", 320],
      ["hdpi", 480],
      ["xhdpi", 640],
      ["xxhdpi", 960],
      ["xxxhdpi", 1280],
    ]);
  });

  it("centers every generated logo within half a pixel", () => {
    for (const asset of report.generated) {
      expect(Math.abs(asset.logoCenterX - asset.width / 2)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(asset.logoCenterY - asset.height / 2)).toBeLessThanOrEqual(0.5);
    }
  });

  it("writes square files with their declared dimensions", async () => {
    for (const asset of report.generated) {
      const metadata = await sharp(path.join(generatedRoot, asset.path)).metadata();
      expect(metadata.format).toBe(asset.platform === "android" ? "png" : "webp");
      expect(metadata.width).toBe(asset.width);
      expect(metadata.height).toBe(asset.height);
    }
  });

  it("keeps the canvas transparent without an edge-connected background", async () => {
    for (const asset of report.generated) {
      const { data, info } = await sharp(path.join(generatedRoot, asset.path))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
      const logoLeft = Math.floor(asset.logoCenterX - asset.logoWidth / 2);
      const logoTop = Math.floor(asset.logoCenterY - asset.logoHeight / 2);
      const logoRight = logoLeft + asset.logoWidth;
      const logoBottom = logoTop + asset.logoHeight;
      let transparentPixels = 0;
      let nontransparentBackgroundPixels = 0;

      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const alpha = alphaAt(x, y);
          if (alpha === 0) {
            transparentPixels += 1;
          }
          if (
            alpha !== 0 &&
            (x < logoLeft || x >= logoRight || y < logoTop || y >= logoBottom)
          ) {
            nontransparentBackgroundPixels += 1;
          }
        }
      }

      expect(alphaAt(0, 0)).toBe(0);
      expect(alphaAt(info.width - 1, 0)).toBe(0);
      expect(alphaAt(0, info.height - 1)).toBe(0);
      expect(alphaAt(info.width - 1, info.height - 1)).toBe(0);
      expect(transparentPixels / (info.width * info.height)).toBeGreaterThan(0.7);
      expect(nontransparentBackgroundPixels).toBe(0);
    }
  });

  it("points the PWA splash at the generated web asset", () => {
    expect(pwaConfig.splashPath).toBe(
      "/pwa/splash/generated/web/app-splash-logo-640.webp",
    );
  });

  it("serves the prebuilt splash directly without the Next image proxy", () => {
    const component = fs.readFileSync(
      path.join(root, "components/PWA/AppSplash.tsx"),
      "utf8",
    );
    expect(component).toContain("<img");
    expect(component).toContain("src={brand.splashPath}");
    expect(component).not.toContain('from "next/image"');
  });
});
