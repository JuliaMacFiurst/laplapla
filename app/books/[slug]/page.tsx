import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import StandaloneBookScreen from "@/components/StandaloneBookScreen";
import { supabase } from "@/lib/supabase";
import {
  buildBookPageDescription,
  findBookBySlug,
  getBookPathSlug,
} from "@/lib/books";
import { dictionaries, type Lang } from "@/i18n";
import type { Book } from "@/types/types";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const isLang = (value: string): value is Lang =>
  value === "ru" || value === "en" || value === "he";

const getRouteLang = async (): Promise<Lang> => {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("laplapla_lang")?.value;
  return cookieLang && isLang(cookieLang) ? cookieLang : "ru";
};

const getBookSummary = (book: Book) =>
  (typeof book.description === "string" && book.description.trim()) ||
  (typeof book.summary === "string" && book.summary.trim()) ||
  buildBookPageDescription(book);

const loadBookNeighbors = async (book: Book) => {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("title", { ascending: true })
    .limit(500);

  if (error) {
    return {
      previousBook: null as Book | null,
      nextBook: null as Book | null,
    };
  }

  const books = (data || []) as Book[];
  const currentIndex = books.findIndex((item) => String(item.id) === String(book.id));

  return {
    previousBook: currentIndex > 0 ? books[currentIndex - 1] : null,
    nextBook: currentIndex >= 0 && currentIndex < books.length - 1 ? books[currentIndex + 1] : null,
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await findBookBySlug(slug);

  if (!book) {
    return {
      title: "Book Not Found | LapLapLa",
    };
  }

  return {
    title: `${book.title} — читать кратко | LapLapLa`,
    description: getBookSummary(book),
    alternates: {
      canonical: `/books/${slug}`,
    },
  };
}

export default async function BookPage({ params }: PageProps) {
  const [{ slug }, lang] = await Promise.all([params, getRouteLang()]);
  const book = await findBookBySlug(slug);

  if (!book) {
    notFound();
  }

  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const { previousBook, nextBook } = await loadBookNeighbors(book);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: book.author ? {
      "@type": "Person",
      name: book.author,
    } : undefined,
    datePublished: book.year,
    inLanguage: lang,
    description: getBookSummary(book),
  };

  return (
    <main className="capybara-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="breadcrumb">
        <Link href="/capybara">Книги</Link> {"→"} <span>{book.title}</span>
      </nav>
      <StandaloneBookScreen book={book} lang={lang} t={t} />
      <div className="book-seo-navigation">
        {previousBook ? (
          <Link href={`/books/${getBookPathSlug(previousBook)}`}>
            ← {previousBook.title}
          </Link>
        ) : null}
        {nextBook ? (
          <Link href={`/books/${getBookPathSlug(nextBook)}`}>
            {nextBook.title} →
          </Link>
        ) : null}
      </div>
    </main>
  );
}
