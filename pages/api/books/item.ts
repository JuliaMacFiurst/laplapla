import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { translateBookForLang } from "@/lib/books";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lang = getRequestLang(req);
  const bookId = Array.isArray(req.query.book_id) ? req.query.book_id[0] : req.query.book_id;

  if (!bookId) {
    return res.status(400).json({ error: "book_id is required" });
  }

  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json(await translateBookForLang(data, lang));
  } catch (error) {
    console.error("Failed to load book by id:", error);
    res.status(500).json({ error: "Failed to load book" });
  }
}
