import type { NextApiRequest, NextApiResponse } from "next";
import { loadStoredQuiz, sanitizeQuiz } from "@/pages/api/books/_quiz";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const bookId = Array.isArray(req.query.bookId) ? req.query.bookId[0] : req.query.bookId;

  if (!bookId) {
    return res.status(400).json({ error: "bookId is required" });
  }

  try {
    const quiz = await loadStoredQuiz(bookId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    return res.status(200).json(sanitizeQuiz(quiz));
  } catch (error) {
    console.error("Failed to load safe quiz:", error);
    return res.status(500).json({ error: "Failed to load quiz" });
  }
}
