import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { buildBookAgeCategories, type AgeCategoryOption, type BookGenreOption } from "@/lib/books/filters";
import type { Lang } from "@/i18n";
import { getRequestLang } from "@/lib/i18n/routing";
import type { Book } from "@/types/types";

type BooksFiltersResponse = {
  ageCategories: AgeCategoryOption[];
  genres: BookGenreOption[];
};

type RawCategoryRow = Record<string, unknown>;

const BOOK_CATEGORY_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  kids: {
    ru: "Детские",
    en: "Children's",
    he: "ילדים",
  },
  fantasy: {
    ru: "Фэнтези",
    en: "Fantasy",
    he: "פנטזיה",
  },
  classic: {
    ru: "Классика",
    en: "Classics",
    he: "קלאסיקה",
  },
  detective: {
    ru: "Детективы",
    en: "Detective Fiction",
    he: "ספרות בלשית",
  },
  science: {
    ru: "Наука",
    en: "Science",
    he: "מדע",
  },
  philosophy: {
    ru: "Философия",
    en: "Philosophy",
    he: "פילוסופיה",
  },
  uzhasy: {
    ru: "Ужасы",
    en: "Horror",
    he: "אימה",
  },
  priklyucheniya: {
    ru: "Приключения",
    en: "Adventure",
    he: "הרפתקאות",
  },
  istoricheskaya: {
    ru: "Историческая",
    en: "Historical Fiction",
    he: "ספרות היסטורית",
  },
  podrostkovaya: {
    ru: "Подростковая",
    en: "Young Adult",
    he: "נוער",
  },
  roman: {
    ru: "Роман",
    en: "Novel",
    he: "רומן",
  },
  antiutopiya: {
    ru: "Антиутопия",
    en: "Dystopian Fiction",
    he: "ספרות דיסטופית",
  },
  satira: {
    ru: "Сатира",
    en: "Satire",
    he: "סאטירה",
  },
  drama: {
    ru: "Драма",
    en: "Drama",
    he: "דרמה",
  },
};

function getTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getLocalizedRowField(row: RawCategoryRow, lang: Lang, field: string) {
  const directCandidates = [
    row[`${field}_${lang}`],
    row[`${field}${lang.toUpperCase()}`],
    row[`${field}${lang[0].toUpperCase()}${lang.slice(1)}`],
  ];

  for (const candidate of directCandidates) {
    const value = getTrimmedString(candidate);
    if (value) {
      return value;
    }
  }

  const translations =
    getRecord(row.translations) ??
    getRecord(row.translation) ??
    getRecord(row.locale_labels) ??
    getRecord(row.localized_labels);
  const localizedEntry = getRecord(translations?.[lang]);
  const nestedValue =
    getTrimmedString(localizedEntry?.[field]) ||
    getTrimmedString(translations?.[`${field}_${lang}`]) ||
    getTrimmedString(translations?.[lang]);

  return nestedValue;
}

function getCategoryLabel(row: RawCategoryRow, lang: Lang) {
  const slug = getTrimmedString(row.slug);
  const knownTranslation = BOOK_CATEGORY_TRANSLATIONS[slug]?.[lang];
  if (knownTranslation) {
    return knownTranslation;
  }

  for (const field of ["title", "name", "label", "category"]) {
    const localizedValue = getLocalizedRowField(row, lang, field);
    if (localizedValue) {
      return localizedValue;
    }
  }

  const candidates = [row.title, row.name, row.label, row.category, row.slug];
  const label = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof label === "string" ? label.trim() : "";
}

function getCategoryValue(row: RawCategoryRow) {
  const slug = getTrimmedString(row.slug);
  if (slug) {
    return slug;
  }

  const category = getTrimmedString(row.category);
  if (category) {
    return category;
  }

  const id = row.id;
  if (typeof id === "string" || typeof id === "number") {
    return String(id);
  }

  return getTrimmedString(row.label);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BooksFiltersResponse | { error: string }>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const lang = getRequestLang(req);
    const supabase = createServerSupabaseClient();
    const [{ data: bookRows, error: booksError }, { data: categoryRows, error: categoriesError }] = await Promise.all([
      supabase.from("books").select("id, age_group"),
      supabase.from("categories").select("*"),
    ]);

    if (booksError) {
      throw booksError;
    }

    if (categoriesError) {
      throw categoriesError;
    }

    const books = (Array.isArray(bookRows) ? bookRows : []) as Book[];
    const ageCategories = buildBookAgeCategories(books);
    const genres = (Array.isArray(categoryRows) ? categoryRows : [])
      .map((row) => {
        const label = getCategoryLabel(row as RawCategoryRow, lang);
        const value = getCategoryValue(row as RawCategoryRow);
        if (!label || !value) {
          return null;
        }

        return {
          value,
          label,
        };
      })
      .filter((genre): genre is BookGenreOption => Boolean(genre))
      .sort((left, right) => left.label.localeCompare(right.label, lang, { sensitivity: "base" }));

    return res.status(200).json({ ageCategories, genres });
  } catch (error) {
    console.error("Failed to load book filters:", error);
    return res.status(500).json({ error: "Failed to load book filters" });
  }
}
