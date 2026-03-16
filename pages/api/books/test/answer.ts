import type { NextApiRequest, NextApiResponse } from "next";
import { loadStoredQuiz } from "@/pages/api/books/_quiz";

const isValidIndex = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { bookId, questionIndex, selectedIndex } = req.body ?? {};

  if (!bookId || !isValidIndex(questionIndex) || !isValidIndex(selectedIndex)) {
    return res.status(400).json({ error: "bookId, questionIndex and selectedIndex are required" });
  }

  try {
    const quiz = await loadStoredQuiz(bookId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const question = quiz.quiz?.[questionIndex];
    if (!question || !Array.isArray(question.options)) {
      return res.status(404).json({ error: "Question not found" });
    }

    const correctAnswerIndex = question.correctAnswerIndex;
    if (!isValidIndex(correctAnswerIndex)) {
      return res.status(500).json({ error: "Quiz answer is invalid" });
    }

    if (selectedIndex === correctAnswerIndex) {
      return res.status(200).json({ correct: true });
    }

    return res.status(200).json({
      correct: false,
      correctAnswerIndex,
    });
  } catch (error) {
    console.error("Failed to validate quiz answer:", error);
    return res.status(500).json({ error: "Failed to validate answer" });
  }
}
