import { describe, expect, it } from "vitest";

import { resolveCatCategory, splitLocalizedCategoryLabel } from "../lib/catCategories";

describe("cat category taxonomy", () => {
  it("splits localized compound category labels", () => {
    expect(splitLocalizedCategoryLabel("Когнитивная лингвистика и Антропология", "ru")).toEqual({
      first: "Когнитивная лингвистика",
      second: "Антропология",
    });
    expect(splitLocalizedCategoryLabel("Cognitive Linguistics and Anthropology", "en")).toEqual({
      first: "Cognitive Linguistics",
      second: "Anthropology",
    });
    expect(splitLocalizedCategoryLabel("בלשנות קוגניטיבית ואנתרופולוגיה", "he")).toEqual({
      first: "בלשנות קוגניטיבית",
      second: "אנתרופולוגיה",
    });
    expect(splitLocalizedCategoryLabel("Neurobiology", "en")).toEqual({
      first: "Neurobiology",
      second: null,
    });
  });

  it("uses the localized first part for dynamic category labels", () => {
    const source = {
      category: "Когнитивная лингвистика и Антропология",
      categoryKey: "custom:когнитивная-лингвистика",
    };

    expect(resolveCatCategory({ ...source, categoryLabel: "Cognitive Linguistics and Anthropology" }, "en")?.label)
      .toBe("Cognitive Linguistics");
    expect(resolveCatCategory({ ...source, categoryLabel: "בלשנות קוגניטיבית ואנתרופולוגיה" }, "he")?.label)
      .toBe("בלשנות קוגניטיבית");
  });

  it("uses the first part of mixed labels as the category root", () => {
    expect(resolveCatCategory({ category: "История и Искусство" }, "ru")?.key).toBe("history");
    expect(resolveCatCategory({ category: "Искусство и История" }, "ru")?.key).toBe("art");
  });

  it("keeps physics mixed with stories or literature under physics and math", () => {
    expect(resolveCatCategory({ category: "Физика и Литература" }, "ru")?.key).toBe("physics-math");
    expect(resolveCatCategory({ category: "Физика и Истории" }, "ru")?.key).toBe("physics-math");
    expect(resolveCatCategory({ category: "Физика и Книги" }, "ru")?.key).toBe("physics-math");
  });

  it("uses the generic science category only for generic science labels", () => {
    expect(resolveCatCategory({ category: "Наука" }, "ru")?.key).toBe("science-general");
    expect(resolveCatCategory({ category: "Музыка и Наука" }, "ru")?.key).toBe("music");
  });

  it("keeps unknown mixed categories visible as dynamic categories", () => {
    const category = resolveCatCategory({ category: "нейробиология и лингвистика" }, "ru");

    expect(category?.key).toBe("custom:нейробиология");
    expect(category?.label).toBe("Нейробиология");
  });

  it("resolves API-provided dynamic category keys with the original category label", () => {
    const category = resolveCatCategory({
      category: "нейробиология и лингвистика",
      categoryKey: "custom:нейробиология-и-лингвистика",
      categoryLabel: "нейробиология и лингвистика",
    }, "ru");

    expect(category?.key).toBe("custom:нейробиология");
    expect(category?.label).toBe("Нейробиология");
  });

  it("keeps unknown first parts from mixed known categories as their own dynamic root", () => {
    const category = resolveCatCategory({ category: "Геометрия и Искусство" }, "ru");

    expect(category?.key).toBe("custom:геометрия");
    expect(category?.label).toBe("Геометрия");
  });

  it("uses known first parts from mixed categories as canonical roots", () => {
    const category = resolveCatCategory({ category: "Химия и Природа" }, "ru");
    const materialsCategory = resolveCatCategory({ category: "Химия Материалов" }, "ru");

    expect(category?.key).toBe("chemistry");
    expect(category?.label).toBe("Химия и вещества");
    expect(materialsCategory?.key).toBe("chemistry");
    expect(materialsCategory?.label).toBe("Химия и вещества");
  });

  it("uses known roots inside the first part of mixed categories", () => {
    const category = resolveCatCategory({ category: "Химия материалов и Сопромат" }, "ru");

    expect(category?.key).toBe("chemistry");
    expect(category?.label).toBe("Химия и вещества");
  });

  it("groups new mixed categories by the same unknown first part", () => {
    expect(resolveCatCategory({ category: "Спелеология и Физиология" }, "ru")?.key).toBe("custom:спелеология");
    expect(resolveCatCategory({ category: "Спелеология и Геология" }, "ru")?.key).toBe("custom:спелеология");
    expect(resolveCatCategory({ category: "Спелеология и Физиология" }, "ru")?.label).toBe("Спелеология");
  });

  it("keeps Philosophy and AI reachable through its canonical category in every locale", () => {
    const source = {
      category: "Философия и искусственный интеллект",
      categoryKey: "custom:философия-и-искусственный-интеллект",
    };

    expect(resolveCatCategory({ ...source, categoryLabel: "Философия и искусственный интеллект" }, "ru"))
      .toMatchObject({ key: "custom:философия-и-искусственный-интеллект", label: "Философия и искусственный интеллект", groupKey: "human" });
    expect(resolveCatCategory({ ...source, categoryLabel: "Philosophy & Artificial Intelligence" }, "en"))
      .toMatchObject({ key: "custom:философия-и-искусственный-интеллект", label: "Philosophy & Artificial Intelligence", groupKey: "human" });
    expect(resolveCatCategory({ ...source, categoryLabel: "פילוסופיה ובינה מלאכותית" }, "he"))
      .toMatchObject({ key: "custom:философия-и-искусственный-интеллект", label: "פילוסופיה ובינה מלאכותית", groupKey: "human" });
  });

  it("makes every categorized searchable preset resolvable by taxonomy", () => {
    const searchablePresets = [
      { category: "Физика и математика", lang: "ru" as const },
      { category: "Philosophy and Artificial Intelligence", lang: "en" as const },
      { category: "קטגוריה חדשה", lang: "he" as const },
    ];
    expect(searchablePresets.every((preset) => resolveCatCategory(preset, preset.lang) !== null)).toBe(true);
  });
});
