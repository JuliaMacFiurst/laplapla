import type { AnyCatPreset } from "@/content/cats";

type CatCategorySource = Pick<AnyCatPreset, "category" | "categoryKey" | "categoryLabel">;

export type ResolvedCatCategory = {
  key: string;
  label: string;
};

export function normalizeCatCategoryKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolveCatCategory(source: CatCategorySource): ResolvedCatCategory | null {
  const key = normalizeCatCategoryKey(source.categoryKey ?? source.category ?? "");
  const label = String(source.categoryLabel ?? source.category ?? "").trim();

  if (!key || !label) {
    return null;
  }

  return { key, label };
}
