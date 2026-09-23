import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/router", () => ({
  useRouter: () => ({ locale: "ru", query: {}, push: vi.fn() }),
}));

import BedtimeStoriesLibrary, {
  buildBedtimeStoryDescription,
  buildBedtimeStoryPath,
} from "@/components/bedtime/BedtimeStoriesLibrary";
import {
  buildBedtimeStorySitemapEntries,
  isPublicBedtimeStoryRow,
  normalizeBedtimeStory,
  type BedtimeStory,
} from "@/lib/bedtimeStories";
import { buildCanonicalUrl } from "@/lib/i18n/routing";
import { resolveBedtimeStoryPageProps } from "@/pages/bedtime-stories/[slug]";

const imageUrls = {
  "ru-01": "https://media.example.com/sand/ru/slide-01.webp",
  "en-01": "https://media.example.com/sand/en/slide-01.webp",
  "he-01": "https://media.example.com/sand/he/slide-01.webp",
};
const publicRow = {
  id: "e0915bc7-3c05-4455-a58a-3339a8a3b0c3",
  slug: "sand-is-not-just-sand",
  title: {
    ru: "Песок — это не просто песок!",
    en: "Sand Is Not Just Sand!",
    he: "חול הוא לא סתם חול!",
  },
  cover_image_url: imageUrls["ru-01"],
  exported_image_urls: imageUrls,
  slides: [],
  status: "exported",
  is_published: true,
  publish_date: "2026-09-23T12:18:16Z",
  created_at: "2026-09-23T12:00:00Z",
};
const legacyPublicRow = {
  ...publicRow,
  id: "df7fb98b-470b-4fd5-a355-e3c01706c82c",
  slug: "sturgeon-who-listened-to-the-sky",
  title: {
    ru: "Осётр, который слушал небо",
    en: "The Sturgeon Who Listened to the Sky",
    he: "החדקן שהקשיב לשמיים",
  },
  status: "exported",
  is_published: false,
  publish_date: null,
  created_at: "2026-06-12T19:46:41.608686Z",
};

function story(lang: "ru" | "en" | "he" = "ru") {
  const normalized = normalizeBedtimeStory(publicRow, lang);
  if (!normalized) throw new Error("fixture did not normalize");
  return normalized;
}

describe("permanent Bedtime Story URLs", () => {
  it("resolves a published story by slug for a direct route", async () => {
    const sand = story();
    const result = await resolveBedtimeStoryPageProps(sand.slug, "ru", {
      loadStory: async (slug) => slug === sand.slug ? sand : null,
      loadStories: async () => [sand],
    });
    expect(result?.story.slug).toBe("sand-is-not-just-sand");
    expect(result?.stories).toEqual([sand]);
  });

  it("returns no route props for unknown stories and keeps drafts private", async () => {
    const loaders = {
      loadStory: async () => null,
      loadStories: async () => [] as BedtimeStory[],
    };
    expect(await resolveBedtimeStoryPageProps("unknown", "ru", loaders)).toBeNull();
    expect(isPublicBedtimeStoryRow({ ...publicRow, status: "draft" })).toBe(false);
    expect(isPublicBedtimeStoryRow(publicRow)).toBe(true);
  });

  it("keeps a legacy exported story public when publication metadata is unset", async () => {
    expect(isPublicBedtimeStoryRow(legacyPublicRow)).toBe(true);

    const sturgeon = normalizeBedtimeStory(legacyPublicRow, "ru");
    if (!sturgeon) throw new Error("legacy fixture did not normalize");
    const result = await resolveBedtimeStoryPageProps(sturgeon.slug, "ru", {
      loadStory: async (slug) => slug === sturgeon.slug ? sturgeon : null,
      loadStories: async () => [sturgeon],
    });
    expect(result?.story.slug).toBe("sturgeon-who-listened-to-the-sky");
  });

  it("renders crawlable library links to the stored slug", () => {
    const sand = story();
    const markup = renderToStaticMarkup(
      <BedtimeStoriesLibrary lang="ru" stories={[sand]} />,
    );
    expect(markup).toContain('href="/bedtime-stories/sand-is-not-just-sand"');
    expect(markup).toContain("Песок — это не просто песок!");
  });

  it("builds a story-specific canonical path and localized metadata", () => {
    const sand = story();
    const path = buildBedtimeStoryPath(sand.slug);
    expect(path).toBe("/bedtime-stories/sand-is-not-just-sand");
    expect(buildCanonicalUrl("https://www.laplapla.com", path, "ru"))
      .toBe("https://www.laplapla.com/bedtime-stories/sand-is-not-just-sand");
    expect(buildCanonicalUrl("https://www.laplapla.com", path, "en"))
      .toBe("https://www.laplapla.com/en/bedtime-stories/sand-is-not-just-sand");
    expect(buildBedtimeStoryDescription(sand, "ru")).toContain(sand.title);
  });

  it("adds current and legacy exported stories to the sitemap but excludes drafts", () => {
    const entries = buildBedtimeStorySitemapEntries([
      publicRow,
      legacyPublicRow,
      { ...publicRow, id: "draft", slug: "draft-story", status: "draft" },
      {
        ...publicRow,
        id: "ru-only",
        slug: "ru-only",
        exported_image_urls: { "ru-01": imageUrls["ru-01"] },
      },
    ]);
    expect(entries).toEqual([
      { path: "/bedtime-stories/sand-is-not-just-sand", eligibleLangs: ["ru", "en", "he"] },
      { path: "/bedtime-stories/sturgeon-who-listened-to-the-sky", eligibleLangs: ["ru", "en", "he"] },
      { path: "/bedtime-stories/ru-only", eligibleLangs: ["ru"] },
    ]);
  });

  it.each(["ru", "en", "he"] as const)("keeps %s story images language-scoped", (lang) => {
    expect(story(lang).previewUrl).toBe(imageUrls[`${lang}-01`]);
  });
});
