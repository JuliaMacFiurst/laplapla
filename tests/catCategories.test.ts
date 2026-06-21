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
});
