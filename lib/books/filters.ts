import type { Book } from "@/types/types";

export type AgeRange = {
  min: number;
  max: number;
};

export type AgeCategoryOption = {
  value: string;
  label: string;
  kind: "range" | "text";
  min?: number;
  max?: number;
};

export type BookGenreOption = {
  value: string;
  label: string;
};

const AGE_RANGE_PATTERN = /(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?/g;
const FIXED_AGE_BUCKETS: AgeRange[] = [
  { min: 0, max: 5 },
  { min: 5, max: 8 },
  { min: 8, max: 14 },
  { min: 14, max: 18 },
];

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTextLabel(value: string) {
  return normalizeWhitespace(
    value
      .replace(/[.,;]+/g, " ")
      .replace(/\b(лет|года|год|years?|ages?)\b/giu, " ")
      .replace(/\s+/g, " "),
  );
}

function createRangeValue(range: AgeRange) {
  return `${range.min}-${range.max}`;
}

function formatRangeLabel(range: AgeRange) {
  return range.min === range.max ? String(range.min) : `${range.min}-${range.max}`;
}

function rangesOverlap(left: AgeRange, right: AgeRange) {
  return left.min <= right.max && right.min <= left.max;
}

export function extractAgeRanges(ageGroup: unknown): AgeRange[] {
  const rawValue = String(ageGroup ?? "").trim();
  if (!rawValue) {
    return [];
  }

  const ranges: AgeRange[] = [];

  for (const match of rawValue.matchAll(AGE_RANGE_PATTERN)) {
    const start = Number.parseInt(match[1] || "", 10);
    const end = Number.parseInt(match[2] || match[1] || "", 10);

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      continue;
    }

    ranges.push({
      min: Math.min(start, end),
      max: Math.max(start, end),
    });
  }

  return ranges.filter(
    (range, index, items) =>
      items.findIndex((candidate) => candidate.min === range.min && candidate.max === range.max) === index,
  );
}

export function buildBookAgeCategories(books: Book[]): AgeCategoryOption[] {
  const booksWithNumericAge = books.some((book) => extractAgeRanges(book.age_group).length > 0);
  const rangeOptions: AgeCategoryOption[] = FIXED_AGE_BUCKETS.map((range) => ({
    value: createRangeValue(range),
    label: formatRangeLabel(range),
    kind: "range",
    min: range.min,
    max: range.max,
  }));

  if (booksWithNumericAge) {
    return rangeOptions;
  }

  const textLabels = uniqueStrings(
    books
      .map((book) => normalizeTextLabel(String(book.age_group ?? "")))
      .filter(Boolean),
  );

  return textLabels.map((label) => ({
    value: `text:${label.toLowerCase()}`,
    label,
    kind: "text",
  }));
}

export function resolveBookAgeCategoryValues(
  ageGroup: unknown,
  categories: AgeCategoryOption[],
) {
  const rawValue = String(ageGroup ?? "").trim();
  if (!rawValue) {
    return [];
  }

  const ranges = extractAgeRanges(rawValue);
  const textLabel = normalizeTextLabel(rawValue);
  const matches = new Set<string>();

  for (const category of categories) {
    if (category.kind === "range" && ranges.length > 0 && typeof category.min === "number" && typeof category.max === "number") {
      const categoryRange = { min: category.min, max: category.max };
      if (ranges.some((range) => rangesOverlap(range, categoryRange))) {
        matches.add(category.value);
      }
    }

    if (category.kind === "text" && textLabel && category.label.toLowerCase() === textLabel.toLowerCase()) {
      matches.add(category.value);
    }
  }

  return Array.from(matches);
}
