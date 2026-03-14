import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const bookId = req.query.book_id;

  if (!bookId) {
    return res.status(400).json({ error: "book_id is required" });
  }

  try {
    const { data, error } = await supabase
      .from("book_tests")
      .select("*")
      .eq("book_id", bookId);

    if (error) {
      throw error;
    }

    res.status(200).json(data || []);
  } catch (error) {
    console.error("Failed to load tests:", error);
    res.status(500).json({ error: "Failed to load tests" });
  }
}
