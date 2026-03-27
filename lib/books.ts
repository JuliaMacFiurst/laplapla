import { supabase } from "@/lib/supabase";
import { getTranslationPayload, getTranslationPayloadMap } from "@/lib/contentTranslations";
import type { Lang } from "@/i18n";
import type { Book, ExplanationMode } from "@/types/types";

const normalizeBookSlug = (value: unknown) =>
  decodeURIComponent(String(value ?? ""))
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const stripLeadingArticle = (value: unknown) =>
  normalizeBookSlug(value).replace(/^(the|a|an)-/, "");

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "j",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const transliterateRussianSlug = (value: unknown) =>
  normalizeBookSlug(
    Array.from(decodeURIComponent(String(value ?? "")).trim().toLowerCase())
      .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
      .join(""),
  );

const getModeLabel = (mode: ExplanationMode) =>
  String(mode.slug || mode.title || mode.name || mode.id);

const MODE_LABELS: Record<string, Record<Lang, string>> = {
  plot: {
    ru: "Сюжет",
    en: "Plot",
    he: "עלילה",
  },
  characters: {
    ru: "Персонажи",
    en: "Characters",
    he: "דמויות",
  },
  main_idea: {
    ru: "Главная идея",
    en: "Main idea",
    he: "רעיון מרכזי",
  },
  philosophy: {
    ru: "Философия",
    en: "Philosophy",
    he: "פילוסופיה",
  },
  conflicts: {
    ru: "Конфликты",
    en: "Conflicts",
    he: "קונפליקטים",
  },
  author_message: {
    ru: "Послание автора",
    en: "Author's message",
    he: "מסר המחבר",
  },
  ending_meaning: {
    ru: "Смысл финала",
    en: "Ending meaning",
    he: "משמעות הסיום",
  },
  twenty_seconds: {
    ru: "Книга за 20 секунд",
    en: "Book in 20 seconds",
    he: "ספר ב-20 שניות",
  },
};

const MODE_ALIASES: Record<string, string> = {
  idea: "main_idea",
  mainidea: "main_idea",
  "main-idea": "main_idea",
  ending: "ending_meaning",
  "ending-meaning": "ending_meaning",
  endingmeaning: "ending_meaning",
  "author-message": "author_message",
  authormessage: "author_message",
  "20-seconds": "twenty_seconds",
  "20seconds": "twenty_seconds",
  twentyseconds: "twenty_seconds",
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const asArray = (value: unknown) => Array.isArray(value) ? value : [];

const normalizeModeKey = (value: unknown) => {
  const normalized = normalizeBookSlug(value).replace(/-/g, "_");
  return MODE_ALIASES[normalized] || normalized;
};

const applyBookTranslation = (book: Book, translation: unknown): Book => {
  const record = asRecord(translation);
  if (!record) {
    return {
      ...book,
      translated: false,
    };
  }

  return {
    ...book,
    title: typeof record.title === "string" && record.title.trim() ? record.title : book.title,
    author: typeof record.author === "string" && record.author.trim() ? record.author : book.author,
    description: typeof record.description === "string" && record.description.trim() ? record.description : book.description,
    translated: true,
  };
};

export async function translateBookForLang(book: Book, lang: Lang): Promise<Book> {
  if (lang === "ru") {
    return {
      ...book,
      translated: true,
    };
  }

  const translation = await getTranslationPayload("book", book.id, lang);
  return applyBookTranslation(book, translation);
}

export async function translateBooksForLang(books: Book[], lang: Lang): Promise<Book[]> {
  if (lang === "ru" || books.length === 0) {
    return books.map((book) => ({ ...book, translated: true }));
  }

  const translationMap = await getTranslationPayloadMap("book", books.map((book) => book.id), lang);
  return books.map((book) => applyBookTranslation(book, translationMap.get(String(book.id))));
}

export async function findBookBySlug(rawSlug: string, lang: Lang = "ru"): Promise<Book | null> {
  const slug = decodeURIComponent(rawSlug).trim();
  const normalizedSlug = normalizeBookSlug(slug);
  if (process.env.NODE_ENV === "development") {
    console.log("[BOOK] slug lookup start:", {
      rawSlug,
      slug,
      normalizedSlug,
      lang,
    });
  }

  if (!slug) {
    if (process.env.NODE_ENV === "development") {
      console.log("[BOOK] slug result:", undefined);
    }
    return null;
  }

  const { data: exactSlugMatch, error: exactSlugError } = await supabase
    .from("books")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!exactSlugError && exactSlugMatch) {
    if (process.env.NODE_ENV === "development") {
      console.log("[BOOK] exact slug match:", {
        slug,
        bookId: exactSlugMatch.id,
        bookSlug: exactSlugMatch.slug,
      });
    }
    return translateBookForLang(exactSlugMatch as Book, lang);
  }

  const { data: exactIdMatch, error: exactIdError } = await supabase
    .from("books")
    .select("*")
    .eq("id", slug)
    .maybeSingle();

  if (exactIdError) {
    throw exactIdError;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[BOOK] exact id match:", {
      slug,
      bookId: exactIdMatch?.id ?? null,
    });
  }
  if (exactIdMatch) {
    return translateBookForLang(exactIdMatch as Book, lang);
  }

  const translationLookupLanguages = Array.from(new Set([lang, "en", "he", "ru"].filter(Boolean)));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const { createClient } = await import("@supabase/supabase-js");
  const translationClient = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : supabase;

  const { data: translationMatches, error: translationMatchError } = await translationClient
    .from("content_translations")
    .select("content_id, language, translation")
    .eq("content_type", "book")
    .in("language", translationLookupLanguages);

  if (translationMatchError) {
    throw translationMatchError;
  }

  const parseTranslationRecord = (value: unknown): Record<string, unknown> | null => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        return asRecord(parsed);
      } catch {
        return null;
      }
    }

    return asRecord(value);
  };

  const matchedTranslation = translationLookupLanguages
    .flatMap((translationLang) => (translationMatches || []).filter((row) => row.language === translationLang))
    .find((row) => {
      const translation = parseTranslationRecord(row.translation);
      const title = translation?.title;
      const titleSlug = normalizeBookSlug(title);
      const articlelessTitleSlug = stripLeadingArticle(title);
      const transliteratedTitleSlug = transliterateRussianSlug(title);

      return (
        titleSlug === normalizedSlug ||
        articlelessTitleSlug === normalizedSlug ||
        transliteratedTitleSlug === normalizedSlug ||
        String(row.content_id) === slug
      );
    });

  if (process.env.NODE_ENV === "development") {
    console.log("[BOOK] translation lookup:", {
      slug,
      lang,
      translationLookupLanguages,
      translationRowsCount: translationMatches?.length ?? 0,
      matchedTranslation: matchedTranslation ? {
        contentId: matchedTranslation.content_id,
        language: matchedTranslation.language,
      } : null,
    });
  }

  if (matchedTranslation?.content_id) {
    const { data: translatedIdMatch, error: translatedIdError } = await supabase
      .from("books")
      .select("*")
      .eq("id", matchedTranslation.content_id)
      .maybeSingle();

    if (translatedIdError) {
      throw translatedIdError;
    }

    if (translatedIdMatch) {
      if (process.env.NODE_ENV === "development") {
        console.log("[BOOK] translation content_id match:", {
          slug,
          contentId: matchedTranslation.content_id,
          bookId: translatedIdMatch.id,
          bookSlug: translatedIdMatch.slug,
        });
      }
      return translateBookForLang(translatedIdMatch as Book, lang);
    }
  }

  const { data: allBooks, error: allBooksError } = await supabase
    .from("books")
    .select("*");

  if (allBooksError) {
    throw allBooksError;
  }

  const allBookRows = (allBooks || []) as Book[];
  const translationMap = await getTranslationPayloadMap("book", allBookRows.map((book) => book.id), lang);
  const englishTranslationMap = lang === "en"
    ? translationMap
    : await getTranslationPayloadMap("book", allBookRows.map((book) => book.id), "en");

  const fallbackMatch = allBookRows.find((book) => {
    const candidates = [
      book.slug,
      book.id,
      book.title,
      book.book_slug,
      book.url_slug,
      book.path_slug,
      book.legacy_slug,
      translationMap.get(String(book.id))?.title,
      englishTranslationMap.get(String(book.id))?.title,
    ];

    return candidates.some((candidate) => {
      const normalizedCandidate = normalizeBookSlug(candidate);
      const articlelessCandidate = stripLeadingArticle(candidate);
      const transliteratedCandidate = transliterateRussianSlug(candidate);
      return (
        normalizedCandidate === normalizedSlug ||
        articlelessCandidate === normalizedSlug ||
        transliteratedCandidate === normalizedSlug
      );
    });
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[BOOK] fallback scan result:", {
      slug,
      normalizedSlug,
      bookId: fallbackMatch?.id ?? null,
      bookSlug: fallbackMatch?.slug ?? null,
    });
  }

  return fallbackMatch ? translateBookForLang(fallbackMatch, lang) : null;
}

export function getBookPathSlug(book: Book) {
  return normalizeBookSlug(book.slug || book.id);
}

export async function loadExplanationModes(): Promise<ExplanationMode[]> {
  const { data, error } = await supabase
    .from("explanation_modes")
    .select("*");

  if (error) {
    throw error;
  }

  return (data || []) as ExplanationMode[];
}

export function getExplanationModeSegment(mode: ExplanationMode) {
  return normalizeBookSlug(getModeLabel(mode));
}

export function getExplanationModeKey(mode: ExplanationMode) {
  return normalizeModeKey(mode.slug || mode.title || mode.name || mode.id);
}

export function getLocalizedExplanationModeLabel(mode: ExplanationMode, lang: Lang) {
  const localized = MODE_LABELS[getExplanationModeKey(mode)]?.[lang];
  return localized || getModeLabel(mode);
}

export function findExplanationModeBySegment(
  modes: ExplanationMode[],
  rawMode: string,
): ExplanationMode | null {
  const normalizedMode = normalizeBookSlug(rawMode);

  return modes.find((mode) => (
    String(mode.id).trim().toLowerCase() === rawMode.trim().toLowerCase() ||
    getExplanationModeSegment(mode) === normalizedMode
  )) || null;
}

export function buildBookPageTitle(book: Book) {
  const author = typeof book.author === "string" && book.author.trim() ? `, ${book.author}` : "";
  return `${book.title}${author} | LapLapLa`;
}

export function buildBookModePageTitle(book: Book, mode: ExplanationMode | null) {
  if (!mode) {
    return buildBookPageTitle(book);
  }

  return `${book.title} | ${getModeLabel(mode)} | LapLapLa`;
}

export function buildBookPageDescription(book: Book) {
  if (typeof book.description === "string" && book.description.trim()) {
    return book.description.trim();
  }

  const year = typeof book.year === "string" || typeof book.year === "number"
    ? ` (${String(book.year).trim()})`
    : "";

  return `Read ${book.title}${year} with interactive slides, explanation modes, and quiz questions.`;
}

export function buildBookHref(book: Book) {
  return `/books/${getBookPathSlug(book)}`;
}

export function buildBookModeHref(book: Book, mode: ExplanationMode) {
  return `${buildBookHref(book)}/${getExplanationModeSegment(mode)}`;
}

export function getTranslatedSlidesForMode(
  translation: unknown,
  mode: ExplanationMode,
) {
  const record = asRecord(translation);
  const sections = asArray(record?.sections);
  const modeKey = getExplanationModeKey(mode);
  const section = sections
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .find((item) => {
      const sectionKey = normalizeModeKey(item.mode_slug || item.mode_name || item.slug || item.title || item.name);
      return sectionKey === modeKey;
    });

  const slides = asArray(section?.slides)
    .map((item, index) => {
      const slide = asRecord(item);
      const text = typeof slide?.text === "string" ? slide.text.trim() : "";
      return text ? { id: `translated-slide-${index}`, text } : null;
    })
    .filter((item): item is { id: string; text: string } => Boolean(item));

  return slides.length ? slides : null;
}

export function getTranslatedBookTests(
  translation: unknown,
  bookId: string | number,
) {
  const record = asRecord(translation);
  const tests = asArray(record?.tests)
    .map((item, index) => {
      const test = asRecord(item);
      const questions = asArray(test?.questions)
        .map((questionItem) => {
          const question = asRecord(questionItem);
          const questionText = typeof question?.question === "string" ? question.question.trim() : "";
          const options = asArray(question?.answers)
            .map((answer) => {
              const record = asRecord(answer);
              return typeof record?.text === "string" ? record.text.trim() : "";
            })
            .filter(Boolean);

          return questionText && options.length
            ? {
                question: questionText,
                options,
              }
            : null;
        })
        .filter((item): item is { question: string; options: string[] } => Boolean(item));

      return questions.length
        ? {
            id: `translated-test-${index}`,
            book_id: bookId,
            title: typeof test?.title === "string" ? test.title : "",
            description: typeof test?.description === "string" ? test.description : "",
            questions,
          }
        : null;
    })
    .filter(Boolean);

  return tests;
}
