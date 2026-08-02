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

  it("embeds the authored animated splash without the Next image proxy", () => {
    const component = fs.readFileSync(
      path.join(root, "components/PWA/AnimatedAppSplash.tsx"),
      "utf8",
    );
    expect(component).toContain("<object");
    expect(component).toContain("/pwa/splash/laplapla-splash-animated.svg");
    expect(component).toContain("/pwa/splash/generated/web/app-splash-logo-640.webp");
    expect(component).toContain("app-splash__logo-stage");
    expect(component).toContain("app-splash__logo--static");
    expect(component).toContain("app-splash__logo--animated");
    expect(component).toContain("onLoad={showSvg}");
    expect(component).toContain("onError={keepStaticFallback}");
    expect(component).toContain("const SVG_LOAD_TIMEOUT_MS = 1400");
    expect(component).toContain("Keep the in-flight object alive");
    expect(component).not.toContain('from "next/image"');
  });

  it("keeps the animated raster layers addressable and motion-safe", () => {
    const animatedSvg = fs.readFileSync(
      path.join(root, "public/pwa/splash/laplapla-splash-animated.svg"),
      "utf8",
    );

    for (const id of [
      "pink_paw",
      "fingers",
      "yellow_cat",
      "whiskers",
      "eyes",
      "right_eye",
      "left_eye",
      "nose",
    ]) {
      expect(animatedSvg).toContain(`id="${id}"`);
    }
    expect(animatedSvg).toContain("transform-box: fill-box");
    expect(animatedSvg).toContain('viewBox="-520 -520 2320 2320"');
    expect(animatedSvg).toContain("svg:not(.splash-running)");
    expect(animatedSvg).toContain("animation-play-state:paused");
    expect(animatedSvg).toContain("animation:paw-reveal .84s .10s");
    expect(animatedSvg).toContain("@media (prefers-reduced-motion: reduce)");
    expect(animatedSvg).toContain('id="eyes-animation"');
    expect(animatedSvg).toContain('id="eye-blink-animation"');
    expect(animatedSvg).toContain('id="nose-animation"');
    expect(animatedSvg).toContain(
      '<g id="nose" transform="matrix(1,0,0,1,222.186,-16.0272)">',
    );
    expect(animatedSvg).not.toMatch(/#(?:eyes|nose)\s*\{[^}]*transform:/);
    expect(animatedSvg).not.toContain('id="background"');
    expect(animatedSvg).not.toContain("fill:#fff8ef");
    expect(animatedSvg).not.toContain("stroke-dashoffset");
    expect(animatedSvg).toContain("data:image/webp;base64,");
    expect(animatedSvg).not.toContain("data:image/png;base64,");
  });

  it("renders splash decorations outside the SVG", () => {
    const component = fs.readFileSync(
      path.join(root, "components/PWA/AnimatedAppSplash.tsx"),
      "utf8",
    );
    const styles = fs.readFileSync(path.join(root, "styles/PWAInstall.css"), "utf8");

    expect(component).toContain("app-splash__glow");
    expect(component).toContain("SPARKLE_COLORS");
    expect(component).toContain("app-splash__star-shape");
    expect(component).not.toContain("★");
    expect(component).toContain("length: 8");
    expect(styles).toContain("app-splash-glow-breathe");
    expect(styles).toContain("app-splash-star-pop");
    expect(styles).toContain("app-splash-confetti-burst");
    expect(styles).not.toMatch(/\.app-splash__logo\s*\{[^}]*background-image:/s);
    expect(styles).toContain(".app-splash__logo-stage");
    expect(styles).toContain("position: absolute");
    expect(styles).toContain("object-fit: contain");
    expect(styles).toContain("object-position: center");
  });

  it("keeps the development splash mounted long enough to replay the animation", () => {
    const shell = fs.readFileSync(
      path.join(root, "components/PWA/PWAAppShell.tsx"),
      "utf8",
    );
    const appSplash = fs.readFileSync(
      path.join(root, "components/PWA/AppSplash.tsx"),
      "utf8",
    );
    const nextConfig = fs.readFileSync(path.join(root, "next.config.js"), "utf8");

    expect(shell).toContain('process.env.NODE_ENV === "development"');
    expect(shell).toContain('get("debugSplash") === "1"');
    expect(shell).toContain("const DEBUG_SPLASH_MS = 6000");
    expect(shell).toContain("const replaySplashAnimation = () =>");
    expect(shell).toContain("window.clearTimeout(splashReadyTimer.current)");
    expect(shell).toContain("setSplashAnimationKey((current) => current + 1)");
    expect(nextConfig).toContain('"object-src \'self\'"');
    expect(appSplash).toContain("key={showDebugReplay?.animationKey ?? 0}");
    expect(appSplash).toContain("Повторить анимацию");
  });
});
