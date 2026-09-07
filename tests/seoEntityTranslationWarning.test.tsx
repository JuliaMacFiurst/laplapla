import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SeoEntityPage, { type GroupedStories } from "@/components/SeoEntityPage";
import { getContentTranslationMetadata } from "@/lib/contentTranslationMetadata";
import type { Lang } from "@/i18n";
import type { MapPopupContent, MapPopupType } from "@/types/mapPopup";

vi.mock("next/router", () => ({
  useRouter: () => ({ query: {}, locale: "en", asPath: "/en/map/country/russia" }),
}));

vi.mock("@/components/SEO", () => ({
  default: ({ noindex, alternates }: { noindex?: boolean; alternates?: Array<{ hrefLang: string }> }) => (
    <i data-testid="seo" data-noindex={String(Boolean(noindex))} data-alternates={alternates?.map((item) => item.hrefLang).join(",")} />
  ),
}));
vi.mock("@/components/ads/AdSlot", () => ({ default: () => null }));

const emptyGroups = (): GroupedStories => ({
  country: [],
  culture: [],
  food: [],
  animal: [],
  weather: [],
  river: [],
  sea: [],
  physic: [],
});

function story(
  type: MapPopupType,
  id: string,
  requestedLanguage: Lang,
  native: boolean,
  hasRussianFallback: boolean,
): MapPopupContent {
  return {
    storyId: id,
    type,
    targetId: "Russia",
    lang: native ? requestedLanguage : "ru",
    rawContent: null,
    slides: [{ id: `${id}:slide`, index: 0, text: `${type} content` }],
    source: native ? "content_translations" : "map_story_slides",
    translation: getContentTranslationMetadata(
      requestedLanguage,
      native,
      hasRussianFallback,
    ),
    publication: {
      isApproved: true,
      storyStatus: "ready",
      needsRewrite: false,
      updatedAt: "2026-09-04T00:00:00.000Z",
      sourceValidatedAt: null,
      sourceValidationStatus: "not_checked",
      sources: [],
      aiAssisted: false,
    },
  };
}

function renderPage(
  lang: Lang,
  groupedStories: GroupedStories,
  indexEligible = true,
  eligibleLocales: Lang[] = [lang],
) {
  return renderToStaticMarkup(
    <SeoEntityPage
      entityType="country"
      slug="russia"
      title="Russia"
      groupedStories={groupedStories}
      lang={lang}
      rawTargetId="Russia"
      eligibility={{ indexEligible, sitemapEligible: indexEligible, localeEligible: indexEligible, adsEligible: indexEligible }}
      eligibleLocales={eligibleLocales}
    />,
  );
}

function sectionMarkup(markup: string, section: keyof GroupedStories) {
  const start = markup.indexOf(`data-map-section="${section}"`);
  if (start < 0) return "";
  const next = markup.indexOf("data-map-section=", start + 1);
  return markup.slice(start, next < 0 ? undefined : next);
}

describe("SeoEntityPage section translation warnings", () => {
  it("keeps fallback content visible while marking the page noindex and limiting hreflang", () => {
    const groups = emptyGroups();
    groups.country = [story("country", "country", "en", false, true)];
    const markup = renderPage("en", groups, false, ["ru"]);
    expect(markup).toContain("country content");
    expect(markup).toContain('data-noindex="true"');
    expect(markup).toContain('data-alternates="ru,x-default"');
    expect(markup).not.toContain("data-publisher-trust");
  });

  it("shows the publisher trust layer only on an eligible map article", () => {
    const groups = emptyGroups();
    groups.country = [story("country", "country", "en", true, false)];
    const markup = renderPage("en", groups, true, ["en"]);
    expect(markup).toContain("data-publisher-trust");
    expect(markup).toContain("Edited for publication");
    expect(markup).not.toContain("Sources</p>");
  });

  it("shows warnings only for fallback culture and food sections", () => {
    const groups = emptyGroups();
    groups.country = [story("country", "country", "en", true, false)];
    groups.culture = [story("culture", "culture", "en", false, true)];
    groups.food = [story("food", "food", "en", false, true)];
    const markup = renderPage("en", groups);

    expect(sectionMarkup(markup, "country")).not.toContain('role="note"');
    expect(sectionMarkup(markup, "culture")).toContain('role="note"');
    expect(sectionMarkup(markup, "food")).toContain('role="note"');
  });

  it("removes the Culture warning when its story is fully translated", () => {
    const groups = emptyGroups();
    groups.culture = [story("culture", "culture", "en", true, false)];
    expect(sectionMarkup(renderPage("en", groups), "culture")).not.toContain('role="alert"');
  });

  it("shows the Culture warning for a partial native translation", () => {
    const groups = emptyGroups();
    groups.culture = [story("culture", "culture", "en", true, true)];
    expect(sectionMarkup(renderPage("en", groups), "culture")).toContain('role="note"');
  });

  it("never shows section warnings on a Russian page", () => {
    const groups = emptyGroups();
    groups.culture = [story("culture", "culture", "en", false, true)];
    expect(renderPage("ru", groups)).not.toContain('role="alert"');
  });

  it("renders only one warning for multiple fallback stories in a section", () => {
    const groups = emptyGroups();
    groups.culture = [
      story("culture", "culture-1", "en", false, true),
      story("culture", "culture-2", "en", true, true),
    ];
    const culture = sectionMarkup(renderPage("en", groups), "culture");
    expect(culture.match(/role="note"/g)).toHaveLength(1);
  });

  it("marks only a fully Russian story article as Russian", () => {
    const groups = emptyGroups();
    groups.culture = [story("culture", "russian", "en", false, true)];
    expect(sectionMarkup(renderPage("en", groups), "culture"))
      .toMatch(/data-map-story="culture:russian" lang="ru"/);
  });

  it("does not mark a partial mixed story article as entirely Russian", () => {
    const groups = emptyGroups();
    groups.culture = [story("culture", "partial", "en", true, true)];
    expect(sectionMarkup(renderPage("en", groups), "culture"))
      .not.toMatch(/data-map-story="culture:partial" lang="ru"/);
  });
});
