import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { buildBookAgeCategories, type AgeCategoryOption, type BookGenreOption } from "@/lib/books/filters";
import { resolveBookGenre } from "@/lib/books/categoryTaxonomy";
import type { Lang } from "@/i18n";
import { getRequestLang } from "@/lib/i18n/routing";
import type { Book } from "@/types/types";

type BooksFiltersResponse = {
  ageCategories: AgeCategoryOption[];
  genres: BookGenreOption[];
};

const LEGACY_BOOK_CATEGORY_TRANSLATIONS: Record<string, Record<Lang, string>> = {
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
  "magicheskij-realizm": { ru: "Магический реализм", en: "Magical realism", he: "ריאליזם מאגי" },
  fantastika: { ru: "Фантастика", en: "Speculative fiction", he: "ספרות ספקולטיבית" },
  mistika: { ru: "Мистика", en: "Supernatural fiction", he: "ספרות על-טבעית" },
  "temnoe-fentezi": { ru: "Тёмное фэнтези", en: "Dark fantasy", he: "פנטזיה אפלה" },
  skazka: { ru: "Сказка", en: "Fairy tale", he: "אגדה" },
  "portalnoe-fentezi": { ru: "Портальное фэнтези", en: "Portal fantasy", he: "פנטזיית מעבר" },
  "detskaya-klassika": { ru: "Детская классика", en: "Children's classics", he: "קלאסיקה לילדים" },
  "nauchnaya-fantastika": { ru: "Научная фантастика", en: "Science fiction", he: "מדע בדיוני" },
};

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
        const genre = resolveBookGenre(row as Record<string, unknown>, lang);
        if (!genre || !genre.isFallback) return genre;
        const legacyLabel = LEGACY_BOOK_CATEGORY_TRANSLATIONS[genre.value]?.[lang];
        return legacyLabel ? { ...genre, label: legacyLabel, isFallback: false } : genre;
      })
      .filter((genre): genre is BookGenreOption => Boolean(genre))
      .sort((left, right) => left.groupOrder - right.groupOrder || left.order - right.order || left.label.localeCompare(right.label, lang));

    return res.status(200).json({ ageCategories, genres });
  } catch (error) {
    console.error("Failed to load book filters:", error);
    return res.status(500).json({ error: "Failed to load book filters" });
  }
}
