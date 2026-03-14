import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { dictionaries } from "@/i18n";
import { getRequestLang } from "@/lib/i18n/routing";

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
    const { data: book } = await supabase
      .from("books")
      .select("title")
      .eq("id", bookId)
      .maybeSingle();

    const bookTitle = book?.title ?? t.fallbackSlides.unknownBookTitle;

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
      return res.status(200).json({
        id: null,
        book_id: bookId,
        mode_id: modeId,
        slides: fallbackSlides(t, bookTitle),
      });
    }

    const slides = parseSlides(data.slides);

    res.status(200).json({
      ...data,
      slides: slides.length ? slides : fallbackSlides(t, bookTitle),
    });
  } catch (error) {
    console.error("Failed to load explanation:", error);
    res.status(500).json({ error: t.errors.explanationLoad });
  }
}
