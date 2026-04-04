import type { NextApiRequest, NextApiResponse } from "next";
import { getTranslationPayload } from "@/lib/contentTranslations";
import { getRequestLang } from "@/lib/i18n/routing";
import { getTranslatedBookTests } from "@/lib/books";
import { normalizeBookTests, normalizeBookTestsWithAnswers } from "@/lib/books/bookTests";
import { supabase } from "@/lib/supabase";

const mergeTranslatedTests = (
  translatedTests: ReturnType<typeof getTranslatedBookTests>,
  baseTests: ReturnType<typeof normalizeBookTestsWithAnswers>,
) =>
  baseTests.map((baseTest, testIndex) => {
    const translatedTest = translatedTests[testIndex];

    return {
      id: baseTest.id,
      book_id: baseTest.book_id,
      title: translatedTest?.title || baseTest.title,
      description: translatedTest?.description || baseTest.description,
      questions: baseTest.questions.map((baseQuestion, questionIndex) => {
        const translatedQuestion = translatedTest?.questions?.[questionIndex];

        return {
          question: translatedQuestion?.question || baseQuestion.question,
          options: baseQuestion.options.map(
            (baseOption, optionIndex) => translatedQuestion?.options?.[optionIndex] || baseOption,
          ),
        };
      }),
    };
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lang = getRequestLang(req);
  const bookId = req.query.book_id;

  if (!bookId) {
    return res.status(400).json({ error: "book_id is required" });
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("[BOOK API] tests request:", {
        lang,
        query: req.query,
        url: req.url,
      });
    }

    const { data, error } = await supabase
      .from("book_tests")
      .select("*")
      .eq("book_id", bookId);

    if (error) {
      throw error;
    }

    const normalizedBaseTests = normalizeBookTestsWithAnswers(data || []);

    if (lang !== "ru") {
      const translation = await getTranslationPayload("book", String(bookId), lang);
      const translatedTests = getTranslatedBookTests(translation, String(bookId));
      if (process.env.NODE_ENV === "development") {
        console.log("[BOOK API] tests translation result:", {
          lang,
          bookId: String(bookId),
          baseTestsCount: normalizedBaseTests.length,
          translatedTestsCount: translatedTests.length,
        });
      }
      if (translatedTests.length && normalizedBaseTests.length) {
        return res.status(200).json(mergeTranslatedTests(translatedTests, normalizedBaseTests));
      }
    }

    res.status(200).json(normalizeBookTests(data || []));
  } catch (error) {
    console.error("Failed to load tests:", error);
    res.status(500).json({ error: "Failed to load tests" });
  }
}
