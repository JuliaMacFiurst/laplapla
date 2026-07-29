import { describe, expect, it } from "vitest";
import {
  buildCanonicalUrl,
  buildHreflangLinks,
  buildLegacyLangRedirect,
  buildLocalizedAsPath,
  buildLocalizedHref,
  buildLocalizedPublicPath,
  buildLocalizedQuery,
} from "@/lib/i18n/routing";
import { buildCanonicalMapEntityPath } from "@/lib/mapEntityRouting";
import {
  CORE_SITEMAP_PAGES,
  sitemapContainsOnlyCanonicalPublicUrls,
} from "@/lib/sitemapPolicy";

const ORIGIN = "https://www.laplapla.com";

describe("localized public URL routing", () => {
  it("uses no prefix for Russian and path prefixes for English and Hebrew", () => {
    expect(buildLocalizedPublicPath("/privacy", "ru")).toBe("/privacy");
    expect(buildLocalizedPublicPath("/privacy", "en")).toBe("/en/privacy");
    expect(buildLocalizedPublicPath("/privacy", "he")).toBe("/he/privacy");
  });

  it("removes an existing locale prefix before applying the requested locale", () => {
    expect(buildLocalizedPublicPath("/en/privacy", "en")).toBe("/en/privacy");
    expect(buildLocalizedPublicPath("/he/privacy", "en")).toBe("/en/privacy");
    expect(buildLocalizedPublicPath("/en/en/privacy", "en")).toBe("/en/privacy");
  });

  it("does not add lang to public queries or hrefs", () => {
    expect(buildLocalizedQuery("en", { tab: "map", lang: "ru" })).toEqual({ tab: "map" });
    expect(buildLocalizedHref("/raccoons?tab=map&lang=ru#kitchen", "en")).toBe(
      "/en/raccoons?tab=map#kitchen",
    );
    expect(buildLocalizedAsPath("/he/raccoons?preview=fox&lang=he", "ru")).toBe(
      "/raccoons?preview=fox",
    );
  });

  it("builds self-referencing canonical URLs for every locale", () => {
    expect(buildCanonicalUrl(ORIGIN, "/privacy?lang=en", "ru")).toBe(
      `${ORIGIN}/privacy`,
    );
    expect(buildCanonicalUrl(ORIGIN, "/privacy?lang=en", "en")).toBe(
      `${ORIGIN}/en/privacy`,
    );
    expect(buildCanonicalUrl(ORIGIN, "/privacy?lang=en", "he")).toBe(
      `${ORIGIN}/he/privacy`,
    );
  });

  it("builds a complete query-free hreflang map", () => {
    expect(buildHreflangLinks(ORIGIN, "/terms")).toEqual([
      { hrefLang: "ru", href: `${ORIGIN}/terms` },
      { hrefLang: "en", href: `${ORIGIN}/en/terms` },
      { hrefLang: "he", href: `${ORIGIN}/he/terms` },
      { hrefLang: "x-default", href: `${ORIGIN}/terms` },
    ]);
  });
});

describe("legacy lang redirects", () => {
  it.each([
    ["/privacy", "?lang=ru", "/privacy"],
    ["/privacy", "?lang=en", "/en/privacy"],
    ["/privacy", "?lang=he", "/he/privacy"],
    ["/en/privacy", "?lang=en", "/en/privacy"],
    [
      "/en/raccoons/kitchen/korean-bulgogi-beef",
      "?lang=en",
      "/en/raccoons/kitchen/korean-bulgogi-beef",
    ],
  ])("maps %s%s to %s", (pathname, search, destination) => {
    expect(buildLegacyLangRedirect(pathname, search)).toBe(destination);
  });

  it("preserves useful query parameters while removing only lang", () => {
    expect(
      buildLegacyLangRedirect("/privacy", "?utm_source=gsc&lang=en&preview=1"),
    ).toBe("/en/privacy?utm_source=gsc&preview=1");
  });

  it("ignores API-style or unknown language values at the helper level", () => {
    expect(buildLegacyLangRedirect("/privacy", "?lang=fr")).toBeNull();
    expect(buildLegacyLangRedirect("/privacy", "?preview=1")).toBeNull();
  });
});

describe("sitemap and map canonical rules", () => {
  it("keeps legal pages and excludes technical pages from core sitemap entries", () => {
    const paths = CORE_SITEMAP_PAGES.map(({ path }) => path);
    expect(paths).toEqual(expect.arrayContaining(["/privacy", "/terms", "/licenses"]));
    expect(paths.some((path) => /admin|studio|export|preview|api/.test(path))).toBe(false);
  });

  it("rejects lang query duplicates and technical URLs in sitemap XML", () => {
    expect(
      sitemapContainsOnlyCanonicalPublicUrls(
        `<url><loc>${ORIGIN}/en/privacy</loc></url>`,
      ),
    ).toBe(true);
    expect(
      sitemapContainsOnlyCanonicalPublicUrls(
        `<url><loc>${ORIGIN}/privacy?lang=en</loc></url>`,
      ),
    ).toBe(false);
    expect(
      sitemapContainsOnlyCanonicalPublicUrls(
        `<url><loc>${ORIGIN}/cats/studio</loc></url>`,
      ),
    ).toBe(false);
  });

  it("keeps the animal entity type in its canonical map URL", () => {
    const slug =
      "east-deccan-dry-evergreen-forests-tropical-and-subtropical-dry-broadleaf-forests";
    const path = buildCanonicalMapEntityPath("animal", slug);
    expect(path).toBe(`/map/animal/${slug}`);
    expect(buildCanonicalUrl(ORIGIN, path, "en")).toBe(`${ORIGIN}/en${path}`);
  });
});
