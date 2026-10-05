import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/router", () => ({ useRouter: () => ({ locale: "en", query: {}, push: vi.fn(), pathname: "/library" }) }));
vi.mock("@/lib/analytics/client", () => ({ trackEvent: vi.fn() }));

import LibraryExperience, { buildLibraryItemPath } from "@/components/library/LibraryExperience";
import { buildLibrarySitemapEntries, normalizeLibraryItem, type LibraryRow } from "@/lib/library";
import { getServerSideProps as legacyIndexRedirect } from "@/pages/bedtime-stories";
import { getServerSideProps as legacyDetailRedirect } from "@/pages/bedtime-stories/[slug]";
import { resolveLibraryItemPageProps } from "@/pages/library/[slug]";
import { buildCanonicalUrl, buildHreflangLinks } from "@/lib/i18n/routing";
import { CORE_SITEMAP_PAGES } from "@/lib/sitemapPolicy";

const baseRow: LibraryRow = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "moving-paper-desert",
  title: { en: "Make a Moving Paper Desert", ru: "Подвижная пустыня из бумаги", he: "מדבר נייר בתנועה" },
  description: { en: "Make a tiny layered paper desert with a sun that actually moves.", ru: "Сделайте бумажную пустыню с движущимся солнцем.", he: "צרו מדבר נייר קטן עם שמש שזזה." },
  content_type: "video",
  media: { url: "https://media.example.com/desert.mp4", posterUrl: "https://media.example.com/desert.webp", mimeType: "video/mp4" },
  cover_image_url: "https://media.example.com/desert.webp",
  exported_image_urls: {},
  slides: [],
  status: "published",
  is_published: true,
  publish_date: "2026-10-01T10:00:00Z",
  created_at: "2026-10-01T09:00:00Z",
};

const storyRow: LibraryRow = {
  ...baseRow,
  id: "22222222-2222-4222-8222-222222222222",
  slug: "sand-story",
  content_type: undefined,
  media: undefined,
  cover_image_url: "https://media.example.com/ru-01.webp",
  exported_image_urls: { "ru-01": "https://media.example.com/ru-01.webp", "en-01": "https://media.example.com/en-01.webp", "he-01": "https://media.example.com/he-01.webp" },
  status: "exported",
};

function item(row = baseRow, locale: "en" | "ru" | "he" = "en") {
  const value = normalizeLibraryItem(row, locale, [{ slug: "crafts", label: locale === "ru" ? "Поделки" : locale === "he" ? "יצירה" : "Crafts" }]);
  if (!value) throw new Error("fixture did not normalize");
  return value;
}

describe("LapLapLa Library", () => {
  it("normalizes video and legacy slideshow items without mixing type and category", () => {
    expect(item().contentType).toBe("video");
    expect(item().categories[0].slug).toBe("crafts");
    expect(item(storyRow, "ru").contentType).toBe("slideshow");
    expect(item(storyRow, "ru").pageUrls).toHaveLength(1);
  });

  it.each(["en", "ru", "he"] as const)("uses localized title and description for %s", (locale) => {
    const value = item(baseRow, locale);
    expect(value.title).toBe((baseRow.title as Record<string, string>)[locale]);
    expect(value.description).toBe((baseRow.description as Record<string, string>)[locale]);
  });

  it("hides unpublished items", () => {
    expect(normalizeLibraryItem({ ...baseRow, status: "draft", is_published: false }, "en")).toBeNull();
  });

  it("renders mixed cards, video detail and Hebrew RTL", () => {
    const video = item();
    const story = item(storyRow, "en");
    const listing = renderToStaticMarkup(<LibraryExperience lang="en" items={[video, story]} />);
    expect(listing).toContain('href="/en/library/moving-paper-desert"');
    expect(listing).toContain("Video");
    expect(listing).toContain("Story");
    const detail = renderToStaticMarkup(<LibraryExperience lang="en" items={[video, story]} selectedItem={video} />);
    expect(detail).toContain("<video");
    expect(detail).toContain("playsInline");
    expect(renderToStaticMarkup(<LibraryExperience lang="he" items={[item(baseRow, "he")]} />)).toContain('dir="rtl"');
  });

  it("resolves direct detail pages and sitemap URLs", async () => {
    const video = item();
    const result = await resolveLibraryItemPageProps(video.slug, "en", {
      loadItem: async () => video,
      loadItems: async () => [video],
    });
    expect(result?.item.slug).toBe(video.slug);
    expect(buildLibraryItemPath(video.slug)).toBe("/library/moving-paper-desert");
    expect(buildCanonicalUrl("https://www.laplapla.com", buildLibraryItemPath(video.slug), "he")).toBe("https://www.laplapla.com/he/library/moving-paper-desert");
    expect(buildHreflangLinks("https://www.laplapla.com", "/library").map((link) => link.hrefLang)).toEqual(["ru", "en", "he", "x-default"]);
    expect(CORE_SITEMAP_PAGES.some((entry) => entry.path === "/library")).toBe(true);
    expect(CORE_SITEMAP_PAGES.some((entry) => String(entry.path) === "/bedtime-stories")).toBe(false);
    expect(buildLibrarySitemapEntries([baseRow, storyRow]).map((entry) => entry.path)).toEqual([
      "/library/moving-paper-desert",
      "/library/sand-story",
    ]);
  });

  it("uses one generic analytics stream, updates Home, and introduces no Shop destination", () => {
    const component = readFileSync("components/library/LibraryExperience.tsx", "utf8");
    const home = readFileSync("pages/Home.tsx", "utf8");
    expect(component).toContain('trackEvent("content_open"');
    expect(component).toContain('trackEvent("content_complete"');
    expect(component).not.toContain("bedtime_story_opened");
    expect(component).not.toContain("bedtime_story_completed");
    expect(component).not.toContain('"/shop');
    expect(home).toContain('buildLocalizedPublicPath("/library", lang)');
    expect(home).not.toContain('buildLocalizedPublicPath("/bedtime-stories", lang)');
  });

  it("permanently redirects legacy listing and detail routes with locale", async () => {
    const index = await legacyIndexRedirect({ locale: "he" } as never);
    const detail = await legacyDetailRedirect({ locale: "en", params: { slug: "sand-story" } } as never);
    expect(index).toEqual({ redirect: { destination: "/he/library", permanent: true } });
    expect(detail).toEqual({ redirect: { destination: "/en/library/sand-story", permanent: true } });
  });
});
