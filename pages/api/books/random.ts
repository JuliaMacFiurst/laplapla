import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";
import { translateBookForLang } from "@/lib/books";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lang = getRequestLang(req);
  const rawExcludedIds = Array.isArray(req.query.exclude_ids)
    ? req.query.exclude_ids.join(",")
    : typeof req.query.exclude_ids === "string"
      ? req.query.exclude_ids
      : "";
  const excludedIds = Array.from(new Set(
    rawExcludedIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ));

  try {
    let countQuery = supabase
      .from("books")
      .select("*", { count: "exact", head: true });

    if (excludedIds.length > 0) {
      countQuery = countQuery.not("id", "in", `(${excludedIds.join(",")})`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    if (!count) {
      return res.status(404).json({ error: "No books found" });
    }

    const randomIndex = Math.floor(Math.random() * count);
    let dataQuery = supabase
      .from("books")
      .select("*");

    if (excludedIds.length > 0) {
      dataQuery = dataQuery.not("id", "in", `(${excludedIds.join(",")})`);
    }

    const { data, error } = await dataQuery
      .range(randomIndex, randomIndex)
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json(await translateBookForLang(data, lang));
  } catch (error) {
    console.error("Failed to load random book:", error);
    res.status(500).json({ error: "Failed to load random book" });
  }
}
