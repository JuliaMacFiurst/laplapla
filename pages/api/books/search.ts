import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

const matchesQuery = (book: Record<string, unknown>, query: string) => {
  const searchableValues = [
    book.title,
    book.author,
    book.description,
    Array.isArray(book.keywords) ? book.keywords.join(" ") : book.keywords,
    book.year,
    book.category,
    book.category_id,
  ];

  return searchableValues.some((value) => normalize(value).includes(query));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

  if (!query) {
    return res.status(200).json([]);
  }

  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .limit(500);

    if (error) {
      throw error;
    }

    const normalizedQuery = normalize(query);
    const results = ((data || []) as Record<string, unknown>[])
      .filter((book) => matchesQuery(book, normalizedQuery))
      .slice(0, 20);

    res.status(200).json(results);
  } catch (error) {
    console.error("Failed to search books:", error);
    res.status(500).json({ error: "Failed to search books" });
  }
}
