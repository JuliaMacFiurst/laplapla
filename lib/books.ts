import { supabase } from "@/lib/supabase";
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

const matchesBookSlug = (book: Book, rawSlug: string) => {
  const normalizedSlug = normalizeBookSlug(rawSlug);
  const directSlug = normalizeBookSlug(book.slug);
  const titleSlug = normalizeBookSlug(book.title);
  const bookId = String(book.id).trim().toLowerCase();

  return (
    bookId === rawSlug.trim().toLowerCase() ||
    directSlug === normalizedSlug ||
    titleSlug === normalizedSlug
  );
};

export async function findBookBySlug(rawSlug: string): Promise<Book | null> {
  const slug = decodeURIComponent(rawSlug).trim();
  if (!slug) {
    return null;
  }

  const { data: exactSlugMatch, error: exactSlugError } = await supabase
    .from("books")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!exactSlugError && exactSlugMatch) {
    return exactSlugMatch as Book;
  }

  const { data, error } = await supabase
    .from("books")
    .select("*")
    .limit(500);

  if (error) {
    throw error;
  }

  const books = (data || []) as Book[];
  return books.find((book) => matchesBookSlug(book, slug)) || null;
}

export function getBookPathSlug(book: Book) {
  return normalizeBookSlug(book.slug || book.title || book.id);
}

export async function loadExplanationModes(): Promise<ExplanationMode[]> {
  const { data, error } = await supabase
    .from("explanation_modes")
    .select("*");

  if (error) {
    throw error;
  }

  return (data || []) as ExplanationMode[];
}

export function getExplanationModeSegment(mode: ExplanationMode) {
  return normalizeBookSlug(getModeLabel(mode));
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

export function buildBookPageTitle(book: Book) {
  const author = typeof book.author === "string" && book.author.trim() ? `, ${book.author}` : "";
  return `${book.title}${author} | LapLapLa`;
}

export function buildBookModePageTitle(book: Book, mode: ExplanationMode | null) {
  if (!mode) {
    return buildBookPageTitle(book);
  }

  return `${book.title} | ${getModeLabel(mode)} | LapLapLa`;
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

export function buildBookHref(book: Book) {
  return `/books/${getBookPathSlug(book)}`;
}

export function buildBookModeHref(book: Book, mode: ExplanationMode) {
  return `${buildBookHref(book)}/${getExplanationModeSegment(mode)}`;
}
