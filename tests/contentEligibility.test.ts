import { describe, expect, it } from "vitest";
import { buildEligibleHreflangLinks } from "@/lib/i18n/routing";
import {
  evaluateMapContentEligibility,
  isActiveRecipeEligible,
  type MapEligibilityStory,
} from "@/lib/seo/contentEligibility";
import { buildMapSitemapEntries } from "@/lib/seo/mapSitemapEligibility";
import type { EligibleMapRoute } from "@/lib/server/mapSeoEligibility";

const completeText = [
  "This is a complete opening sentence with useful context for the reader.",
  "A second paragraph explains the subject independently and adds enough detail to make the page useful without another screen. It gives relevant background, describes why the subject matters, and closes the explanation with a clear practical conclusion for the reader.",
  "A third section adds concrete context, connects the important facts, and helps the visitor understand the topic as a coherent whole rather than as an isolated search snippet.",
  "The final section summarizes the result in a self-contained way and gives the reader enough information to finish the page with a meaningful understanding of the subject.",
].map((paragraph) => `${paragraph} ${paragraph}`);

function story(overrides: Partial<MapEligibilityStory> = {}): MapEligibilityStory {
  return {
    textUnits: completeText,
    nativeLocale: true,
    hasFallback: false,
    isApproved: true,
    storyStatus: "ready",
    needsRewrite: false,
    ...overrides,
  };
}

describe("map content eligibility", () => {
  it("keeps a fallback English page accessible but denies indexing, sitemap and ads", () => {
    expect(evaluateMapContentEligibility([story({ nativeLocale: false, hasFallback: true })])).toMatchObject({
      indexEligible: false,
      sitemapEligible: false,
      localeEligible: false,
      adsEligible: false,
      reason: "fallback-locale",
    });
  });

  it("allows complete native English and strong Russian content", () => {
    for (const input of [story(), story({ storyStatus: "READY" })]) {
      expect(evaluateMapContentEligibility([input])).toMatchObject({
        indexEligible: true,
        sitemapEligible: true,
        localeEligible: true,
        adsEligible: true,
      });
    }
  });

  it("denies empty and explicitly incomplete content", () => {
    expect(evaluateMapContentEligibility([story({ textUnits: [] })])).toMatchObject({
      indexEligible: false,
      sitemapEligible: false,
      adsEligible: false,
      reason: "empty-content",
    });
    expect(evaluateMapContentEligibility([story({ needsRewrite: true })])).toMatchObject({
      indexEligible: false,
      sitemapEligible: false,
      adsEligible: false,
      reason: "incomplete-content",
    });
  });

  it("keeps active recipes eligible", () => {
    expect(isActiveRecipeEligible(true)).toEqual({
      indexEligible: true,
      sitemapEligible: true,
      localeEligible: true,
      adsEligible: true,
    });
  });
});

describe("map sitemap and hreflang eligibility", () => {
  const eligible = evaluateMapContentEligibility([story()]);
  const fallback = evaluateMapContentEligibility([story({ nativeLocale: false, hasFallback: true })]);
  const route: EligibleMapRoute = {
    type: "country",
    slug: "example",
    eligibleLocales: ["ru", "en"],
    eligibility: { ru: eligible, en: eligible, he: fallback },
  };

  it("emits only native eligible locale URLs into map sitemap entries", () => {
    const urls = buildMapSitemapEntries([route], "https://www.laplapla.com").map((entry) => entry.url);
    expect(urls).toEqual([
      "https://www.laplapla.com/map/country/example",
      "https://www.laplapla.com/en/map/country/example",
    ]);
    expect(urls.some((url) => url.includes("/he/"))).toBe(false);
  });

  it("advertises only eligible map locale alternatives", () => {
    expect(buildEligibleHreflangLinks(
      "https://www.laplapla.com",
      "/map/country/example",
      route.eligibleLocales,
    )).toEqual([
      { hrefLang: "ru", href: "https://www.laplapla.com/map/country/example" },
      { hrefLang: "en", href: "https://www.laplapla.com/en/map/country/example" },
      { hrefLang: "x-default", href: "https://www.laplapla.com/map/country/example" },
    ]);
  });
});
