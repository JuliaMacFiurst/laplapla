import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workerTemplate = fs.readFileSync(
  path.join(root, "service-worker/sw.template.js"),
  "utf8",
);
const worker = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "public/favicon_io/site.webmanifest"), "utf8"),
) as {
  start_url: string;
  scope: string;
  display: string;
  icons: Array<{ sizes: string; purpose?: string }>;
};
const offline = fs.readFileSync(path.join(root, "public/offline.html"), "utf8");
const pwaStyles = fs.readFileSync(path.join(root, "styles/PWAInstall.css"), "utf8");
const animatedSplashFallbackPath = "/pwa/splash/app-splash-logo-640.webp";

describe("PWA lifecycle", () => {
  it("keeps API, admin, auth and Next data responses out of runtime caches", () => {
    expect(workerTemplate).toContain('pathname.startsWith("/api/")');
    expect(workerTemplate).toContain('pathname.startsWith("/admin")');
    expect(workerTemplate).toContain('pathname.startsWith("/auth/")');
    expect(workerTemplate).toContain('url.pathname.startsWith("/_next/data/")');
  });

  it("uses an explicit offline document only for failed navigations", () => {
    expect(workerTemplate).toContain('request.mode === "navigate"');
    expect(workerTemplate).toContain("navigationNetworkFirst(request)");
    expect(workerTemplate).toContain("fetchNavigationWithConnectivityCheck(request)");
    expect(workerTemplate).toContain("NAVIGATION_TIMEOUT_MS");
    expect(workerTemplate).toContain("NAVIGATION_RECOVERY_DEADLINE_MS");
    expect(workerTemplate).toContain("controller.abort()");
    expect(workerTemplate).toContain('const HEALTH_CHECK_PATH = "__HEALTH_CHECK_PATH__"');
    expect(workerTemplate).toContain('cache: "no-store"');
    expect(workerTemplate).not.toContain('caches.match("/")');
    expect(offline).toContain('id="retry"');
    expect(offline).toContain('window.addEventListener("online"');
    expect(offline).toContain('window.location.replace("/")');
    expect(offline).toContain('#slow-network');
  });

  it("uses the exact root-relative static splash fallback on the offline page", async () => {
    expect(offline).toContain(`src="${animatedSplashFallbackPath}"`);
    expect(offline).not.toMatch(/src="\/(?:ru|en|he)\/pwa\//);
    expect(worker).toContain(`"${animatedSplashFallbackPath}"`);
    expect(workerTemplate).toContain("isValidPrecacheResponse(url, response)");
    expect(workerTemplate).toContain('contentType.startsWith("image/")');

    const assetPath = path.join(root, "public", animatedSplashFallbackPath);
    expect(fs.existsSync(assetPath)).toBe(true);
    const metadata = await sharp(assetPath).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
  });

  it("precaches the exact static fallback used below the animated splash", async () => {
    expect(workerTemplate).toContain(`"${animatedSplashFallbackPath}"`);
    expect(worker).toContain(`"${animatedSplashFallbackPath}"`);
    const assetPath = path.join(root, "public", animatedSplashFallbackPath);
    expect(fs.existsSync(assetPath)).toBe(true);
    const metadata = await sharp(assetPath).metadata();
    expect(metadata).toMatchObject({ format: "webp", width: 640, height: 640 });
  });

  it("precaches the animated SVG under the same versioned worker", () => {
    expect(workerTemplate).toContain(
      'const ANIMATED_SPLASH_PATH = "/pwa/splash/laplapla-splash-animated.svg"',
    );
    expect(worker).toContain('"/pwa/splash/laplapla-splash-animated.svg"');
  });

  it("waits for explicit user consent before activating an update", () => {
    const installHandler = workerTemplate.slice(
      workerTemplate.indexOf('self.addEventListener("install"'),
      workerTemplate.indexOf('self.addEventListener("activate"'),
    );
    expect(installHandler).not.toContain("skipWaiting");
    expect(workerTemplate).toContain('event.data?.type === "SKIP_WAITING"');
  });

  it("keeps the update banner inside narrow mobile viewports", () => {
    const updateToastStyles = pwaStyles.slice(
      pwaStyles.indexOf(".pwa-update-toast {"),
      pwaStyles.indexOf(".pwa-update-toast button"),
    );
    expect(updateToastStyles).toContain("box-sizing: border-box");
    expect(updateToastStyles).toContain("overflow-wrap: anywhere");
    expect(pwaStyles).toContain("max-height: calc(100dvh");
    expect(pwaStyles).toContain(".pwa-update-toast button {\n    width: 100%;");
  });

  it("only deletes versioned LapLapLa caches", () => {
    expect(workerTemplate).toContain("key.startsWith(CACHE_PREFIX)");
    expect(workerTemplate).not.toMatch(
      /keys\.filter\(\(key\) => key !== [A-Z_]+\)\.map/,
    );
  });

  it("has installable core manifest fields and keeps regular and maskable icons separate", () => {
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(
      manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"),
    ).toBe(true);
    expect(
      manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"),
    ).toBe(true);
    expect(
      manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "maskable"),
    ).toBe(true);
    expect(
      manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"),
    ).toBe(true);
  });

  it("keeps the generated worker in sync with its template", () => {
    expect(worker).not.toContain("__APP_VERSION__");
    expect(worker).toContain('const APP_ID = "laplapla"');
    expect(worker).toContain('const OFFLINE_PATH = "/offline.html"');
    expect(worker).toContain(
      '"/pwa/splash/app-splash-logo-640.webp"',
    );
  });
});
