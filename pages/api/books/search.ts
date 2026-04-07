import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { translateBooksForLang } from "@/lib/books";
import { supabase } from "@/lib/supabase";
import type { Book } from "@/types/types";

const MAX_RESULTS = 30;
const ROUTE = "/api/books/search";

const escapeIlike = (value: string) =>
  value.replace(/[,%_]/g, (char) => `\\${char}`);

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
  const lang = getRequestLang(req);
  const rawQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

  if (!query) {
    res.status(200).json([]);
    logApi(res.statusCode, startedAt);
    return;
  }

  try {
    const escapedQuery = escapeIlike(query);
    const searchPattern = `%${escapedQuery}%`;
    const { data, error } = await supabase
      .from("books")
      .select("id, title, slug, author, year")
      .or([
        `title.ilike.${searchPattern}`,
        `slug.ilike.${searchPattern}`,
        `author.ilike.${searchPattern}`,
        `year.ilike.${searchPattern}`,
      ].join(","))
      .limit(MAX_RESULTS);

    if (error) {
      throw error;
    }

    const translatedBooks = await translateBooksForLang((data || []) as Book[], lang);
    res.status(200).json(translatedBooks);
    logApi(res.statusCode, startedAt);
  } catch (error) {
    logApiError(error);
    res.status(500).json({ error: "Failed to search books" });
  }
}
