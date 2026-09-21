import { describe, expect, it } from "vitest";
import { normalizeBedtimeStory } from "@/lib/bedtimeStories";

const baseStory = {
  id: "japan",
  slug: "vkusnaya-yaponiya-12-kulinarnyh-ostanovok",
  title: {
    ru: "Вкусная Япония: 12 кулинарных остановок",
    en: "Eat Your Way Through Japan: 12 Delicious Stops",
    he: "מסע קולינרי ביפן: 12 תחנות טעימות",
  },
  cover_image_url: "https://media.example.com/ru/cover.webp",
  created_at: "2026-09-21T00:00:00Z",
};

const images = {
  "ru-01": "https://media.example.com/ru/slide-01.webp",
  "en-01": "https://media.example.com/en/slide-01.webp",
  "he-01": "https://media.example.com/he/slide-01.webp",
  "ru-02": "https://media.example.com/ru/slide-02.webp",
  "en-02": "https://media.example.com/en/slide-02.webp",
  "he-02": "https://media.example.com/he/slide-02.webp",
};

describe("Bedtime Stories production image resolution", () => {
  it.each([
    ["ru", [images["ru-01"], images["ru-02"]]],
    ["en", [images["en-01"], images["en-02"]]],
    ["he", [images["he-01"], images["he-02"]]],
  ] as const)("uses only %s images for the card and reader", (lang, expectedPages) => {
    const story = normalizeBedtimeStory({ ...baseStory, exported_image_urls: images }, lang);
    expect(story?.previewUrl).toBe(expectedPages[0]);
    expect(story?.pageUrls).toEqual(expectedPages);
  });

  it.each(["en", "he"] as const)("hides %s story when its images are absent", (lang) => {
    const exported_image_urls = Object.fromEntries(
      Object.entries(images).filter(([key]) => !key.startsWith(`${lang}-`)),
    );
    const story = {
      ...baseStory,
      exported_image_urls,
      slides: [{ image_url: images["ru-01"] }],
    };
    expect(normalizeBedtimeStory(story, lang)).toBeNull();
  });

  it("never selects another language by insertion order or a noncanonical key", () => {
    const story = {
      ...baseStory,
      exported_image_urls: {
        "he-01": images["he-01"],
        "ru-01": images["ru-01"],
        "en-extra": images["en-01"],
        "en-02": images["en-02"],
      },
    };
    expect(normalizeBedtimeStory(story, "en")).toBeNull();
    expect(normalizeBedtimeStory(story, "ru")?.pageUrls).toEqual([images["ru-01"]]);
    expect(normalizeBedtimeStory(story, "he")?.pageUrls).toEqual([images["he-01"]]);
  });

  it("keeps legacy Russian slides and cover working", () => {
    const story = {
      ...baseStory,
      exported_image_urls: {},
      slides: [
        { image_url: "https://media.example.com/legacy/slide-01.webp" },
        { image_url: "https://media.example.com/legacy/slide-02.webp" },
      ],
    };
    expect(normalizeBedtimeStory(story, "ru")?.pageUrls).toEqual([
      "https://media.example.com/legacy/slide-01.webp",
      "https://media.example.com/legacy/slide-02.webp",
    ]);
    expect(normalizeBedtimeStory({ ...story, slides: [] }, "ru")?.pageUrls).toEqual([
      baseStory.cover_image_url,
    ]);
    expect(normalizeBedtimeStory(story, "en")).toBeNull();
    expect(normalizeBedtimeStory(story, "he")).toBeNull();
  });

  it("rejects EN and HE legacy URLs while using a safe RU cover", () => {
    const story = {
      ...baseStory,
      exported_image_urls: { "he-01": images["he-01"] },
      slides: [{ image_url: images["en-01"] }],
    };
    expect(normalizeBedtimeStory(story, "ru")?.pageUrls).toEqual([baseStory.cover_image_url]);
    expect(normalizeBedtimeStory(story, "en")).toBeNull();
    expect(normalizeBedtimeStory(story, "he")?.pageUrls).toEqual([images["he-01"]]);
    expect(normalizeBedtimeStory({ ...story, cover_image_url: images["en-01"] }, "ru")).toBeNull();
  });
});
