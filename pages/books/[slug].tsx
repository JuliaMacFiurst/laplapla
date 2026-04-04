import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import StandaloneBookScreenPages from "@/components/StandaloneBookScreenPages";
import { buildBookPageDescription, getBookPathSlug } from "@/lib/books/shared";
import { buildLocalizedHref, isLang } from "@/lib/i18n/routing";
import { dictionaries, type Lang } from "@/i18n";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { Book } from "@/types/types";

type Props = {
  book: Book;
  previousBook: Book | null;
  nextBook: Book | null;
  lang: Lang;
};

const BOOKS_LABEL: Record<Lang, string> = {
  ru: "Книги",
  en: "Books",
  he: "ספרים",
};

const BOOK_METADATA_SUFFIX: Record<Lang, string> = {
  ru: "читать кратко",
  en: "read in slides",
  he: "לקרוא בסליידים",
};

const getBookSummary = (book: Book) =>
  (typeof book.description === "string" && book.description.trim()) ||
  (typeof book.summary === "string" && book.summary.trim()) ||
  buildBookPageDescription(book);

const loadBookNeighbors = async (book: Book, lang: Lang) => {
  const { translateBooksForLang } = await import("@/lib/books");
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    return {
      previousBook: null as Book | null,
      nextBook: null as Book | null,
    };
  }

  const books = await translateBooksForLang((data || []) as Book[], lang);
  const currentIndex = books.findIndex((item) => String(item.id) === String(book.id));

  return {
    previousBook: currentIndex > 0 ? books[currentIndex - 1] : null,
    nextBook: currentIndex >= 0 && currentIndex < books.length - 1 ? books[currentIndex + 1] : null,
  };
};

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { findBookBySlug } = await import("@/lib/books");
  const slug = typeof context.params?.slug === "string" ? context.params.slug : "";
  const lang = isLang(context.locale) ? context.locale : isLang(context.query.lang) ? context.query.lang : "ru";
  const book = await findBookBySlug(slug, lang);

  if (!book) {
    return { notFound: true };
  }

  const { previousBook, nextBook } = await loadBookNeighbors(book, lang);

  return {
    props: {
      book,
      previousBook,
      nextBook,
      lang,
    },
  };
};

export default function BookPage({
  book,
  previousBook,
  nextBook,
  lang,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const breadcrumbArrow = lang === "he" ? "←" : "→";
  const previousArrow = lang === "he" ? "→" : "←";
  const nextArrow = lang === "he" ? "←" : "→";

  return (
    <>
      <Head>
        <title>{`${book.title} — ${BOOK_METADATA_SUFFIX[lang]} | LapLapLa`}</title>
        <meta name="description" content={getBookSummary(book)} />
      </Head>
      <main className="capybara-page-container">
        <nav aria-label="breadcrumb">
          <Link href={buildLocalizedHref("/capybara", lang)}>{BOOKS_LABEL[lang]}</Link> {breadcrumbArrow} <span>{book.title}</span>
        </nav>
        <StandaloneBookScreenPages book={book} lang={lang} t={t} />
        <div className="book-seo-navigation">
          {previousBook ? (
            <Link href={buildLocalizedHref(`/books/${getBookPathSlug(previousBook)}`, lang)}>
              <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{previousArrow}</span> {previousBook.title}
            </Link>
          ) : null}
          {nextBook ? (
            <Link href={buildLocalizedHref(`/books/${getBookPathSlug(nextBook)}`, lang)}>
              {nextBook.title} <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{nextArrow}</span>
            </Link>
          ) : null}
        </div>
      </main>
    </>
  );
}
