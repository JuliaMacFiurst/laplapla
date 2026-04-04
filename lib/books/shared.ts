import type { Lang } from "@/i18n";
import type { Book, ExplanationMode } from "@/types/types";

const normalizeBookSlug = (value: unknown) =>
  decodeURIComponent(String(value ?? ""))
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const getModeLabel = (mode: ExplanationMode) =>
  String(mode.slug || mode.title || mode.name || mode.id);

const MODE_LABELS: Record<string, Record<Lang, string>> = {
  plot: {
    ru: "Сюжет",
    en: "Plot",
    he: "עלילה",
  },
  characters: {
    ru: "Персонажи",
    en: "Characters",
    he: "דמויות",
  },
  main_idea: {
    ru: "Главная идея",
    en: "Main idea",
    he: "רעיון מרכזי",
  },
  philosophy: {
    ru: "Философия",
    en: "Philosophy",
    he: "פילוסופיה",
  },
  conflicts: {
    ru: "Конфликты",
    en: "Conflicts",
    he: "קונפליקטים",
  },
  author_message: {
    ru: "Послание автора",
    en: "Author's message",
    he: "מסר המחבר",
  },
  ending_meaning: {
    ru: "Смысл финала",
    en: "Ending meaning",
    he: "משמעות הסיום",
  },
  twenty_seconds: {
    ru: "Книга за 20 секунд",
    en: "Book in 20 seconds",
    he: "ספר ב-20 שניות",
  },
};

const MODE_ALIASES: Record<string, string> = {
  idea: "main_idea",
  mainidea: "main_idea",
  "main-idea": "main_idea",
  ending: "ending_meaning",
  "ending-meaning": "ending_meaning",
  endingmeaning: "ending_meaning",
  "author-message": "author_message",
  authormessage: "author_message",
  "20-seconds": "twenty_seconds",
  "20seconds": "twenty_seconds",
  twentyseconds: "twenty_seconds",
};

const normalizeModeKey = (value: unknown) => {
  const normalized = normalizeBookSlug(value).replace(/-/g, "_");
  return MODE_ALIASES[normalized] || normalized;
};

export function getBookPathSlug(book: Book) {
  return normalizeBookSlug(book.slug || book.id);
}

export function getExplanationModeSegment(mode: ExplanationMode) {
  return normalizeBookSlug(getModeLabel(mode));
}

export function getExplanationModeKey(mode: ExplanationMode) {
  return normalizeModeKey(mode.slug || mode.title || mode.name || mode.id);
}

export function getLocalizedExplanationModeLabel(mode: ExplanationMode, lang: Lang) {
  const localized = MODE_LABELS[getExplanationModeKey(mode)]?.[lang];
  return localized || getModeLabel(mode);
}

export function buildBookHref(book: Book) {
  return `/books/${getBookPathSlug(book)}`;
}

export function buildBookModeHref(book: Book, mode: ExplanationMode) {
  return `${buildBookHref(book)}/${getExplanationModeSegment(mode)}`;
}

export function findExplanationModeBySegment(
  modes: ExplanationMode[],
  rawMode: string,
): ExplanationMode | null {
  const normalizedMode = normalizeBookSlug(rawMode);

  return modes.find((mode) => (
    String(mode.id).trim().toLowerCase() === rawMode.trim().toLowerCase() ||
    getExplanationModeSegment(mode) === normalizedMode
  )) || null;
}

export function buildBookPageDescription(book: Book) {
  if (typeof book.description === "string" && book.description.trim()) {
    return book.description.trim();
  }

  const year = typeof book.year === "string" || typeof book.year === "number"
    ? ` (${String(book.year).trim()})`
    : "";

  return `Read ${book.title}${year} with interactive slides, explanation modes, and quiz questions.`;
}
