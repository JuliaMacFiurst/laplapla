/**
 * Normalizes a user search query for tag-based search.
 * The goal is NOT linguistic correctness, but stable matching with tags.
 *
 * Supported heuristics:
 * - Russian: rough stem by stripping common endings
 * - English: singularization (dogs -> dog, cats -> cat)
 * - Hebrew: strip common plural / possessive suffixes
 *
 * This is a lightweight search heuristic, not NLP.
 */
export function normalizeSearchQuery(input: string): string {
  const value = input.trim().toLowerCase();
  if (value.length <= 2) return value;

  // --- Hebrew (very lightweight heuristic) ---
  // Plural suffixes: ים, ות
  if (/[\u0590-\u05FF]/.test(value)) {
    if (value.endsWith("ים") && value.length > 3) {
      return value.slice(0, -2);
    }
    if (value.endsWith("ות") && value.length > 3) {
      return value.slice(0, -2);
    }
    return value;
  }

  // --- English ---
  if (/^[a-z]/.test(value)) {
    if (value.endsWith("ies") && value.length > 4) {
      return value.slice(0, -3) + "y";
    }
    if (value.endsWith("es") && value.length > 3) {
      return value.slice(0, -2);
    }
    if (value.endsWith("s") && value.length > 3) {
      return value.slice(0, -1);
    }
    return value;
  }

  // --- Russian ---
  if (value.length <= 3) return value;

  const multiEndings = ["ами", "ями", "ями", "ями"];
  const singleEndings = ["а", "я", "ы", "и", "е", "у", "ю", "о"];

  for (const ending of multiEndings) {
    if (value.endsWith(ending) && value.length > ending.length + 2) {
      return value.slice(0, -ending.length);
    }
  }

  for (const ending of singleEndings) {
    if (value.endsWith(ending) && value.length > 4) {
      return value.slice(0, -1);
    }
  }

  return value;
}