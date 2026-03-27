import type { NextApiRequest, NextApiResponse } from "next";
import { getTranslationPayload } from "@/lib/contentTranslations";
import { supabase } from "@/lib/supabase";
import { dictionaries } from "@/i18n";
import { getRequestLang } from "@/lib/i18n/routing";
import { getTranslatedSlidesForMode } from "@/lib/books";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

const parseSlides = (value: unknown) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const fallbackSlides = (t: CapybaraPageDict, bookTitle: string) => [
  { text: t.fallbackSlides.line1.replace("{title}", bookTitle) },
  { text: t.fallbackSlides.line2 },
  { text: t.fallbackSlides.line3 },
  { text: t.fallbackSlides.line4 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lang = getRequestLang(req);
  const dict = dictionaries[lang] ?? dictionaries["ru"];
  const t = dict.capybaras.capybaraPage;

  const bookId = req.query.book_id;
  const modeId = req.query.mode_id;

  if (!bookId || !modeId) {
    return res.status(400).json({ error: t.errors.invalidParams });
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.log("[BOOK API] explanation request:", {
        lang,
        query: req.query,
        url: req.url,
      });
    }

    const [{ data: book }, { data: mode }] = await Promise.all([
      supabase
        .from("books")
        .select("title")
        .eq("id", bookId)
        .maybeSingle(),
      supabase
        .from("explanation_modes")
        .select("*")
        .eq("id", modeId)
        .maybeSingle(),
    ]);

    const bookTitle = book?.title ?? t.fallbackSlides.unknownBookTitle;

    if (lang !== "ru" && mode) {
      const translation = await getTranslationPayload("book", String(bookId), lang);
      const translatedSlides = getTranslatedSlidesForMode(translation, mode);
      if (process.env.NODE_ENV === "development") {
        console.log("[BOOK API] explanation translation result:", {
          lang,
          bookId: String(bookId),
          modeId: String(modeId),
          hasTranslation: Boolean(translation),
          translatedSlidesCount: translatedSlides?.length ?? 0,
        });
      }
      if (translatedSlides?.length) {
        return res.status(200).json({
          id: null,
          book_id: bookId,
          mode_id: modeId,
          slides: translatedSlides,
        });
      }
    }

    const { data, error } = await supabase
      .from("book_explanations")
      .select("id, book_id, mode_id, slides")
      .eq("book_id", bookId)
      .eq("mode_id", modeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      if (process.env.NODE_ENV === "development") {
        console.log("[BOOK API] explanation fallback slides:", {
          lang,
          bookId: String(bookId),
          modeId: String(modeId),
          reason: "no_book_explanations_row",
        });
      }
      return res.status(200).json({
        id: null,
        book_id: bookId,
        mode_id: modeId,
        slides: fallbackSlides(t, bookTitle),
      });
    }

    const slides = parseSlides(data.slides);

    if (process.env.NODE_ENV === "development") {
      console.log("[BOOK API] explanation db result:", {
        lang,
        bookId: String(bookId),
        modeId: String(modeId),
        slidesCount: slides.length,
      });
    }

    res.status(200).json({
      ...data,
      slides: slides.length ? slides : fallbackSlides(t, bookTitle),
    });
  } catch (error) {
    console.error("Failed to load explanation:", error);
    res.status(500).json({ error: t.errors.explanationLoad });
  }
}
