import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { normalizeBookTests } from "@/pages/api/books/_tests";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const bookId = Array.isArray(req.query.bookId) ? req.query.bookId[0] : req.query.bookId;

  if (!bookId) {
    return res.status(400).json({ error: "bookId is required" });
  }

  try {
    const { data, error } = await supabase
      .from("book_tests")
      .select("*")
      .eq("book_id", bookId);

    if (error) {
      throw error;
    }

    const quiz = normalizeBookTests(data || [])[0];

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.status(200).json({
      title: quiz.title || "",
      description: quiz.description || "",
      questions: quiz.questions || [],
    });
  } catch (error) {
    console.error("Failed to load safe quiz:", error);
    return res.status(500).json({ error: "Failed to load quiz" });
  }
}
