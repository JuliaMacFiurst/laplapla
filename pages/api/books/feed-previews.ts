import type { NextApiRequest, NextApiResponse } from "next";
import { dictionaries } from "@/i18n";
import { getTranslationPayloadMap } from "@/lib/contentTranslations";
import {
  getExplanationModeKey,
  getTranslatedSlidesForMode,
  loadExplanationModes,
  translateBooksForLang,
} from "@/lib/books";
import { getRequestLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";
import type { Book, BookFeedPreview, ExplanationMode, Slide } from "@/types/types";

const DEFAULT_COUNT = 4;
const MAX_COUNT = 6;

const parseSlides = (value: unknown): Slide[] => {
  if (Array.isArray(value)) {
    return value as Slide[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as Slide[] : [];
    } catch {
      return [];
    }
  }

  return [];
};

const parseExcludedIds = (req: NextApiRequest) => {
  const rawValue = Array.isArray(req.query.exclude_ids)
    ? req.query.exclude_ids.join(",")
    : String(req.query.exclude_ids || "");

  return Array.from(new Set(
    rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ));
};

const getPreviewCount = (value: NextApiRequest["query"][string]) => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_COUNT;
  }

  return Math.max(1, Math.min(MAX_COUNT, Math.floor(parsed)));
};

const getPlotMode = (modes: ExplanationMode[]) =>
  modes.find((mode) => getExplanationModeKey(mode) === "plot") ||
  modes.find((mode) => {
    const label = String(mode.slug || mode.title || mode.name || "").toLowerCase();
    return label.includes("plot") || label.includes("сюжет") || label.includes("story");
  }) ||
  modes[0] ||
  null;

const getFallbackSlide = (lang: ReturnType<typeof getRequestLang>, bookTitle: string): Slide => {
  const t = (dictionaries[lang] || dictionaries.ru).capybaras.capybaraPage;
  return {
    id: "feed-preview-fallback",
    text: t.fallbackSlides.line1.replace("{title}", bookTitle),
  };
};

const applyExcludedIds = <T extends { not: (column: string, operator: string, value: string) => T }>(
  query: T,
  excludedIds: string[],
) => (
  excludedIds.length > 0
    ? query.not("id", "in", `(${excludedIds.join(",")})`)
    : query
);

async function loadRandomBooks(count: number, excludedIds: string[]) {
  const countQuery = applyExcludedIds(
    supabase.from("books").select("id", { count: "exact", head: true }),
    excludedIds,
  );
  const { count: availableCount, error: countError } = await countQuery;
  if (countError) {
    throw countError;
  }
  if (!availableCount) {
    return [];
  }

  const randomIndex = Math.floor(Math.random() * Math.max(availableCount - count + 1, 1));
  const randomBookQuery = applyExcludedIds(
    supabase.from("books").select("id,title,author,year,slug"),
    excludedIds,
  );
  const { data, error } = await randomBookQuery.range(randomIndex, randomIndex + count - 1);
  if (error) {
    throw error;
  }

  return (data || []) as Book[];
}

async function loadFirstPlotSlides(
  books: Book[],
  plotMode: ExplanationMode | null,
  lang: ReturnType<typeof getRequestLang>,
) {
  const fallbackSlides = new Map(books.map((book) => [
    String(book.id),
    getFallbackSlide(lang, book.title),
  ]));

  if (!plotMode || books.length === 0) {
    return fallbackSlides;
  }

  if (lang !== "ru") {
    const translations = await getTranslationPayloadMap("book", books.map((book) => book.id), lang);
    books.forEach((book) => {
      const translatedSlide = getTranslatedSlidesForMode(translations.get(String(book.id)), plotMode)?.[0];
      if (translatedSlide) {
        fallbackSlides.set(String(book.id), translatedSlide);
      }
    });
  }

  const { data, error } = await supabase
    .from("book_explanations")
    .select("book_id,slides")
    .in("book_id", books.map((book) => book.id))
    .eq("mode_id", plotMode.id);

  if (error) {
    throw error;
  }

  data?.forEach((explanation) => {
    const bookId = String(explanation.book_id);
    if (lang !== "ru" && fallbackSlides.get(bookId)?.id !== "feed-preview-fallback") {
      return;
    }

    const firstSlide = parseSlides(explanation.slides)[0];
    if (firstSlide) {
      fallbackSlides.set(bookId, firstSlide);
    }
  });

  return fallbackSlides;
}

const trimPreviewBook = (book: Book): Book => ({
  id: book.id,
  title: book.title,
  author: book.author,
  year: book.year,
  slug: book.slug,
  translated: book.translated,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<BookFeedPreview[] | { error: string }>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lang = getRequestLang(req);
  const count = getPreviewCount(req.query.count);
  const excludedIds = parseExcludedIds(req);

  try {
    const modes = await loadExplanationModes();
    const plotMode = getPlotMode(modes);
    const randomBooks = await loadRandomBooks(count, excludedIds);
    const books = await translateBooksForLang(randomBooks, lang);
    const firstSlides = await loadFirstPlotSlides(books, plotMode, lang);
    const previews = books.map((book) => ({
      book: trimPreviewBook(book),
      plotMode,
      firstSlide: firstSlides.get(String(book.id)) || getFallbackSlide(lang, book.title),
    }));

    return res.status(200).json(previews);
  } catch (error) {
    console.error("Failed to load book feed previews:", error);
    return res.status(500).json({ error: "Failed to load book feed previews" });
  }
}
