import { describe, expect, it } from "vitest";

import { resolveBookGenre } from "../lib/books/categoryTaxonomy";
import { groupBookGenres } from "../lib/books/filters";

const scienceFiction = {
  id: "category-id",
  slug: "nauchnaya-fantastika",
  name: "научная фантастика",
  translations: {
    ru: "Научная фантастика",
    en: "Science fiction",
    he: "מדע בדיוני",
  },
  group_key: "speculative",
  sort_order: 30,
};

describe("book category taxonomy", () => {
  it("keeps one stable selection value across locales", () => {
    expect(["ru", "en", "he"].map((lang) => resolveBookGenre(scienceFiction, lang as "ru" | "en" | "he")?.value))
      .toEqual(["nauchnaya-fantastika", "nauchnaya-fantastika", "nauchnaya-fantastika"]);
  });

  it("reads stored RU, EN and HE labels", () => {
    expect(resolveBookGenre(scienceFiction, "ru")?.label).toBe("Научная фантастика");
    expect(resolveBookGenre(scienceFiction, "en")?.label).toBe("Science fiction");
    expect(resolveBookGenre(scienceFiction, "he")?.label).toBe("מדע בדיוני");
  });

  it("keeps a new untranslated category visible in Other", () => {
    const genre = resolveBookGenre({ id: "new-id", slug: "new-genre", name: "Новый жанр" }, "he");
    expect(genre).toMatchObject({
      value: "new-genre",
      label: "Новый жанр",
      groupKey: "other",
      groupLabel: "אחר",
      isFallback: true,
    });
  });

  it("does not expose a meaningless slug when a canonical label is missing", () => {
    expect(resolveBookGenre({ id: "new-id", slug: "machine-only-slug" }, "en")).toBeNull();
  });

  it("groups and orders genres from stored metadata", () => {
    const later = resolveBookGenre({ ...scienceFiction, slug: "later", sort_order: 40 }, "en")!;
    const earlier = resolveBookGenre({ ...scienceFiction, slug: "earlier", sort_order: 10 }, "en")!;
    const unknown = resolveBookGenre({ slug: "unknown", name: "Unknown" }, "en")!;
    const groups = groupBookGenres([unknown, later, earlier]);

    expect(groups.map((group) => group.key)).toEqual(["speculative", "other"]);
    expect(groups[0].options.map((genre) => genre.value)).toEqual(["earlier", "later"]);
  });

  it("preserves RTL labels as data without changing canonical identity", () => {
    const genre = resolveBookGenre(scienceFiction, "he")!;
    expect(genre.label).toMatch(/[\u0590-\u05ff]/);
    expect(genre.value).toMatch(/^[a-z-]+$/);
  });

  it.each([
    ["magicheskij-realizm", "Magical realism", "ריאליזם מאגי"],
    ["mistika", "Supernatural fiction", "ספרות על-טבעית"],
    ["detskaya-klassika", "Children's classics", "קלאסיקה לילדים"],
    ["temnoe-fentezi", "Dark fantasy", "פנטזיה אפלה"],
    ["portalnoe-fentezi", "Portal fantasy", "פנטזיית מעבר"],
  ])("does not leak Russian for %s after stored backfill", (slug, en, he) => {
    const row = { slug, name: "русский fallback", translations: { en, he } };
    expect(resolveBookGenre(row, "en")?.label).toBe(en);
    expect(resolveBookGenre(row, "he")?.label).toBe(he);
  });
});
