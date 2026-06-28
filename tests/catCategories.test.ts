import { describe, expect, it } from "vitest";

import { resolveCatCategory } from "../lib/catCategories";

describe("cat category taxonomy", () => {
  it("collapses reversed mixed art/history labels into one canonical category", () => {
    expect(resolveCatCategory({ category: "История и Искусство" }, "ru")?.key).toBe(
      resolveCatCategory({ category: "Искусство и История" }, "ru")?.key,
    );
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

    expect(category?.key).toBe("custom:нейробиология-и-лингвистика");
    expect(category?.label).toBe("Нейробиология и лингвистика");
  });

  it("resolves API-provided dynamic category keys with the original category label", () => {
    const category = resolveCatCategory({
      category: "нейробиология и лингвистика",
      categoryKey: "custom:нейробиология-и-лингвистика",
      categoryLabel: "нейробиология и лингвистика",
    }, "ru");

    expect(category?.key).toBe("custom:нейробиология-и-лингвистика");
    expect(category?.label).toBe("Нейробиология и лингвистика");
  });

  it("keeps meaningful mixed known categories as visible dynamic categories", () => {
    const category = resolveCatCategory({ category: "Геометрия и Искусство" }, "ru");

    expect(category?.key).toBe("custom:геометрия-и-искусство");
    expect(category?.label).toBe("Геометрия и Искусство");
  });
});
