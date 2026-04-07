import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { translateBooksForLang } from "@/lib/books";
import { supabase } from "@/lib/supabase";
import type { Book } from "@/types/types";

const MAX_RESULTS = 30;
const ROUTE = "/api/books/search";

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

const matchesQuery = (book: Record<string, unknown>, query: string) => {
  const searchableValues = [
    book.title,
    book.slug,
    book.author,
    book.description,
    Array.isArray(book.keywords) ? book.keywords.join(" ") : book.keywords,
    book.year,
    book.category,
    book.category_id,
  ];

  return searchableValues.some((value) => normalize(value).includes(query));
};

function logApi(status: number, startedAt: number) {
  console.log("[API]", {
    route: ROUTE,
    status,
    duration: Date.now() - startedAt,
  });
}

function logApiError(error: unknown) {
  console.error("[API ERROR]", {
    route: ROUTE,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();

  try {
    const resolvedLang = getRequestLang(req);
    const lang = resolvedLang === "ru" || resolvedLang === "en" || resolvedLang === "he"
      ? resolvedLang
      : "ru";
    const rawQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

    if (!query || query.length < 1) {
      res.status(200).json([]);
      logApi(res.statusCode, startedAt);
      return;
    }

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .limit(500);

    if (error) {
      throw error;
    }

    const books = Array.isArray(data) ? (data as Book[]) : [];
    const filteredBooks = books
      .filter((book) => matchesQuery(book as Record<string, unknown>, normalize(query)))
      .slice(0, MAX_RESULTS);
    let responseBooks = books;

    try {
      responseBooks = await translateBooksForLang(filteredBooks, lang);
    } catch (translationError) {
      console.error("translation error", translationError);
      responseBooks = filteredBooks;
    }

    res.status(200).json(responseBooks);
    logApi(res.statusCode, startedAt);
  } catch (error) {
    logApiError(error);
    console.error("Failed to search books:", error instanceof Error ? error.stack || error.message : error);
    res.status(500).json({ error: "Failed to search books" });
  }
}
