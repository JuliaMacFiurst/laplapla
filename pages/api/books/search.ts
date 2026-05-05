import type { NextApiRequest, NextApiResponse } from "next";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";
import { getRequestLang } from "@/lib/i18n/routing";
import { buildBookAgeCategories, resolveBookAgeCategoryValues } from "@/lib/books/filters";
import { translateBooksForLang } from "@/lib/books";
import { supabase } from "@/lib/supabase";
import type { Book } from "@/types/types";

const MAX_RESULTS = 30;
const ROUTE = "/api/books/search";
const isDebugLogging = process.env.NODE_ENV !== "production";

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

const collectCategoryAliasTokens = (row: Record<string, unknown>) =>
  Array.from(
    new Set(
      [
        row.id,
        row.slug,
        row.category,
        row.label,
        row.name,
        row.title,
      ]
        .map((value) => normalize(value))
        .filter(Boolean),
    ),
  );

const matchesQuery = (book: Record<string, unknown>, query: string) => {
  const searchableValues = [
    book.title,
    book.slug,
    book.author,
    book.description,
    Array.isArray(book.keywords) ? book.keywords.join(" ") : book.keywords,
    book.year,
  ];

  return searchableValues.some((value) => normalize(value).includes(query));
};

const parseMultiValueQueryParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean)));
  }

  if (typeof value !== "string") {
    return [];
  }

  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
};

function logApi(status: number, startedAt: number) {
  if (!isDebugLogging) {
    return;
  }

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
    const selectedAgeCategories = parseMultiValueQueryParam(req.query.age_categories);
    const selectedGenreIds = parseMultiValueQueryParam(req.query.genre_ids);

    if (!query && selectedAgeCategories.length === 0 && selectedGenreIds.length === 0) {
      res.status(200).json([]);
      logApi(res.statusCode, startedAt);
      return;
    }

    let books: Book[] = [];

    if (selectedGenreIds.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*");

      if (categoriesError) {
        throw categoriesError;
      }

      const categoryRows = Array.isArray(categoriesData) ? categoriesData as Record<string, unknown>[] : [];
      const matchedCategoryRows = categoryRows.filter((row) => {
        const aliasTokens = collectCategoryAliasTokens(row);
        return selectedGenreIds.some((selectedGenreId) => aliasTokens.includes(normalize(selectedGenreId)));
      });

      const categoryIds = Array.from(
        new Set(
          matchedCategoryRows
            .map((row) => row.id)
            .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
            .map(String),
        ),
      );

      if (categoryIds.length === 0) {
        books = [];
      } else {
        const { data: bookCategoryRows, error: bookCategoriesError } = await supabase
          .from("book_categories")
          .select("book_id, category_id")
          .in("category_id", categoryIds);

        if (bookCategoriesError) {
          throw bookCategoriesError;
        }

        const bookIds = Array.from(
          new Set(
            (Array.isArray(bookCategoryRows) ? bookCategoryRows : [])
              .map((row) => row.book_id)
              .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
              .map(String),
          ),
        );

        if (bookIds.length === 0) {
          books = [];
        } else {
          const { data: booksData, error: booksError } = await supabase
            .from("books")
            .select("*")
            .in("id", bookIds);

          if (booksError) {
            throw booksError;
          }

          books = Array.isArray(booksData) ? (booksData as Book[]) : [];
        }
      }
    } else {
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*")
        .limit(500);

      if (booksError) {
        throw booksError;
      }

      books = Array.isArray(booksData) ? (booksData as Book[]) : [];
    }

    const ageCategories = buildBookAgeCategories(books);
    const filteredBooks = books
      .filter((book) => {
        if (query && !matchesQuery(book as Record<string, unknown>, normalize(query))) {
          return false;
        }

        if (selectedAgeCategories.length > 0) {
          const bookAgeCategoryValues = resolveBookAgeCategoryValues(book.age_group, ageCategories);
          if (!bookAgeCategoryValues.some((value) => selectedAgeCategories.includes(value))) {
            return false;
          }
        }

        return true;
      })
      .slice(0, MAX_RESULTS);
    let responseBooks = books;

    try {
      responseBooks = await translateBooksForLang(filteredBooks, lang);
    } catch (translationError) {
      if (isDebugLogging) {
        console.error("translation error", translationError);
      }
      responseBooks = filteredBooks;
    }

    res.status(200).json(responseBooks);
    logApi(res.statusCode, startedAt);
  } catch (error) {
    await captureAndAlertServerError(error, {
      route: req.url || ROUTE,
      method: req.method || "GET",
      runtime: "server",
      statusCode: 500,
    });
    logApiError(error);
    console.error("Failed to search books:", error instanceof Error ? error.stack || error.message : error);
    res.status(500).json({ error: "Failed to search books" });
  }
}
