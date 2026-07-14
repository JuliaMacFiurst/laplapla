import { describe, expect, it } from "vitest";

import { resolveCatCategory } from "../lib/catCategories";

describe("cat category taxonomy", () => {
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
});
