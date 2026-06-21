import { describe, expect, it, vi } from "vitest";

const rangeMock = vi.fn();

vi.mock("@/content/cats", () => ({
  CAT_PRESETS: [],
}));

vi.mock("@/lib/catCategories", () => ({
  normalizeCatCategoryKey: (value: string) => value.toLowerCase(),
}));

vi.mock("@/lib/i18n/bidi", () => ({
  isolateMixedBidiText: (value: string) => value,
}));

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({
    from(table: string) {
      if (table === "cat_presets") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => ({
                  data: [{
                    id: "preset-1",
                    legacy_id: null,
                    base_key: "preset",
                    kind: "text",
                    lang: "ru",
                    prompt: "Question",
                    category: "Category",
                    is_active: true,
                    sort_order: 1,
                  }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "cat_preset_slides") {
        const rows = Array.from({ length: 1002 }, (_, index) => ({
          id: `slide-${index + 1}`,
          preset_id: "preset-1",
          slide_order: index + 1,
          text: `Slide ${index + 1}`,
          media_url: null,
          media_type: null,
        }));

        return {
          select: () => ({
            in: () => ({
              order: () => ({
                range: rangeMock.mockImplementation((from: number, to: number) => ({
                  data: rows.slice(from, to + 1),
                  error: null,
                })),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

describe("cat preset loading", () => {
  it("paginates cat preset slides beyond Supabase's default 1000 row page", async () => {
    const { loadCombinedCatPresets } = await import("../lib/server/catPresets");

    const presets = await loadCombinedCatPresets("ru");
    const preset = presets[0];

    expect(preset?.kind).toBe("text");
    if (preset?.kind !== "text") {
      throw new Error("Expected text preset");
    }
    expect(preset.texts).toHaveLength(1002);
    expect(rangeMock).toHaveBeenCalledWith(0, 999);
    expect(rangeMock).toHaveBeenCalledWith(1000, 1999);
  });
});
