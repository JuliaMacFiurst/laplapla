import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_SITEMAP_PAGES } from "@/lib/sitemapPolicy";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Google Play v1 public scope", () => {
  it("routes the former home placeholder to the localized AppLab page", () => {
    const home = read("pages/Home.tsx");
    expect(home).toContain('buildLocalizedPublicPath("/applab", resolvedLang)');
    expect(home).not.toContain("t.sections.comingSoon");
    expect(fs.existsSync(path.join(root, "pages/applab.tsx"))).toBe(true);
  });

  it("publishes AppLab in the canonical sitemap", () => {
    expect(CORE_SITEMAP_PAGES.some((entry) => entry.path === "/applab")).toBe(
      true,
    );
  });

  it("maps every AppLab card to an existing optimized brand icon", () => {
    const appLab = read("pages/applab.tsx");
    const iconPaths = Array.from(
      appLab.matchAll(/appIcon: "(\/icons\/app-lab\/[^"]+\.webp)"/g),
      (match) => match[1],
    );

    expect(iconPaths).toHaveLength(6);
    for (const iconPath of iconPaths) {
      expect(fs.existsSync(path.join(root, "public", iconPath))).toBe(true);
    }
    expect(appLab).toContain('from "next/image"');
    expect(appLab).not.toContain("unoptimized");
  });

  it("keeps unpublished quests out of the public raccoon carousel", () => {
    const raccoons = read("pages/raccoons.tsx");
    expect(raccoons).not.toContain("...quests.upcoming.map");
  });

  it("does not expose unfinished drawing alerts in the public lesson UI", () => {
    const lesson = read("pages/dog/lessons/[slug].tsx");
    expect(lesson).not.toContain("alert(t.comingSoon)");
    expect(lesson).toContain(
      'const showDevelopmentControls = process.env.NODE_ENV !== "production"',
    );
  });

  it("redirects mobile legacy export back to the working studio", () => {
    const exportPage = read("pages/cats/export.tsx");
    expect(exportPage).not.toContain("<MobileDesktopNotice");
    expect(exportPage).toContain(
      'router.replace(buildStudioRoute("cats", lang)',
    );
  });

  it("keeps hidden admin logout unavailable in production", () => {
    const app = read("pages/_app.tsx");
    expect(app).toContain("const showHiddenAdminLogout = !isProduction");
    expect(app).not.toContain(
      '!isProduction || router.query.debug === "true"',
    );
  });
});
