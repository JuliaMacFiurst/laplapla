import type { NextApiRequest, NextApiResponse } from "next";
import { getRequestLang } from "@/lib/i18n/routing";
import { supabase } from "@/lib/supabase";
import { translateBookForLang } from "@/lib/books";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lang = getRequestLang(req);

  try {
    const { count, error: countError } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    if (!count) {
      return res.status(404).json({ error: "No books found" });
    }

    const randomIndex = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from("books")
      .select("*")
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
