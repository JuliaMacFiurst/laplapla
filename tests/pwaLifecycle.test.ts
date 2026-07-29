import fs from "node:fs";
import path from "node:path";
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
    expect(workerTemplate).not.toContain('caches.match("/")');
    expect(offline).toContain('id="retry"');
    expect(offline).toContain('window.addEventListener("online"');
  });

  it("waits for explicit user consent before activating an update", () => {
    const installHandler = workerTemplate.slice(
      workerTemplate.indexOf('self.addEventListener("install"'),
      workerTemplate.indexOf('self.addEventListener("activate"'),
    );
    expect(installHandler).not.toContain("skipWaiting");
    expect(workerTemplate).toContain('event.data?.type === "SKIP_WAITING"');
  });

  it("only deletes versioned LapLapLa caches", () => {
    expect(workerTemplate).toContain("key.startsWith(CACHE_PREFIX)");
    expect(workerTemplate).not.toMatch(
      /keys\.filter\(\(key\) => key !== [A-Z_]+\)\.map/,
    );
  });

  it("has installable core manifest fields and does not mislabel regular icons as maskable", () => {
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some((icon) => icon.sizes === "512x512")).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose?.includes("maskable"))).toBe(false);
  });

  it("keeps the generated worker in sync with its template", () => {
    expect(worker).not.toContain("__APP_VERSION__");
    expect(worker).toContain('const APP_ID = "laplapla"');
    expect(worker).toContain('const OFFLINE_PATH = "/offline.html"');
  });
});
