import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { buildBookAgeCategories, type AgeCategoryOption, type BookGenreOption } from "@/lib/books/filters";
import type { Book } from "@/types/types";

type BooksFiltersResponse = {
  ageCategories: AgeCategoryOption[];
  genres: BookGenreOption[];
};

type RawCategoryRow = Record<string, unknown>;

function getCategoryLabel(row: RawCategoryRow) {
  const candidates = [row.title, row.name, row.label, row.category, row.slug];
  const label = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof label === "string" ? label.trim() : "";
}

function getCategoryValue(row: RawCategoryRow) {
  const id = row.id;
  if (typeof id === "string" || typeof id === "number") {
    return String(id);
  }

  const label = getCategoryLabel(row);
  return label;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BooksFiltersResponse | { error: string }>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createServerSupabaseClient();
    const [{ data: bookRows, error: booksError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
      supabase.from("books").select("id, age_group"),
      supabase.from("categories").select("*"),
    ]);

    if (booksError) {
      throw booksError;
    }

    if (categoriesError) {
      throw categoriesError;
    }

    const books = (Array.isArray(bookRows) ? bookRows : []) as Book[];
    const ageCategories = buildBookAgeCategories(books);
    const genres = (Array.isArray(categoryRows) ? categoryRows : [])
      .map((row) => {
        const label = getCategoryLabel(row as RawCategoryRow);
        const value = getCategoryValue(row as RawCategoryRow);
        if (!label || !value) {
          return null;
        }

        return {
          value,
          label,
        };
      })
      .filter((genre): genre is BookGenreOption => Boolean(genre))
      .sort((left, right) => left.label.localeCompare(right.label, "ru", { sensitivity: "base" }));

    return res.status(200).json({ ageCategories, genres });
  } catch (error) {
    console.error("Failed to load book filters:", error);
    return res.status(500).json({ error: "Failed to load book filters" });
  }
}
