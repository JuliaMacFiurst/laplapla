import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { normalizeBookTestsWithAnswers } from "@/pages/api/books/_tests";

const isValidIndex = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const parseIndex = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { bookId, testId, questionIndex, selectedIndex } = req.body ?? {};
  const normalizedQuestionIndex = parseIndex(questionIndex);
  const normalizedSelectedIndex = parseIndex(selectedIndex);

  if (!bookId || !isValidIndex(normalizedQuestionIndex) || !isValidIndex(normalizedSelectedIndex)) {
    return res.status(400).json({ error: "bookId, questionIndex and selectedIndex are required" });
  }

  try {
    let tests = [] as ReturnType<typeof normalizeBookTestsWithAnswers>;

    if (typeof testId === "string" || typeof testId === "number") {
      const { data, error } = await supabase
        .from("book_tests")
        .select("*")
        .eq("id", testId)
        .limit(1);

      if (error) {
        throw error;
      }

      tests = normalizeBookTestsWithAnswers(data || []);
    }

    if (tests.length === 0) {
      const { data, error } = await supabase
        .from("book_tests")
        .select("*")
        .eq("book_id", bookId);

      if (error) {
        throw error;
      }

      tests = normalizeBookTestsWithAnswers(data || []);
    }

    const quiz = typeof testId === "string" || typeof testId === "number"
      ? tests.find((item) => String(item.id) === String(testId)) || tests[0]
      : tests[0];

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const question = quiz.questions?.[normalizedQuestionIndex];
    if (!question || !Array.isArray(question.options)) {
      return res.status(404).json({ error: "Question not found" });
    }

    const correctAnswerIndex = question.correctIndex;
    if (!isValidIndex(correctAnswerIndex)) {
      return res.status(500).json({ error: "Quiz answer is invalid" });
    }

    if (normalizedSelectedIndex === correctAnswerIndex) {
      return res.status(200).json({ correct: true, correctAnswerIndex });
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
