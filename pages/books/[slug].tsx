import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import CorePageLinks from "@/components/CorePageLinks";
import SEO from "@/components/SEO";
import StandaloneBookScreenPages from "@/components/StandaloneBookScreenPages";
import { buildBookPageDescription, getBookPathSlug } from "@/lib/books/shared";
import { buildLocalizedHref, buildLocalizedPublicPath, isLang } from "@/lib/i18n/routing";
import { dictionaries, type Lang } from "@/i18n";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { Book } from "@/types/types";

type Props = {
  book: Book;
  previousBook: Book | null;
  nextBook: Book | null;
  lang: Lang;
  isCoreSeoBook: boolean;
};

const BACK_TO_FEED_LABEL: Record<Lang, string> = {
  ru: "Назад к ленте книг",
  en: "Back to books feed",
  he: "חזרה לפיד הספרים",
};

function ReaderNavIcon({ direction }: { direction: "back" | "prev" | "next" }) {
  if (direction === "back") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M8 16V8h8M8 8l8 8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={direction === "prev" ? "M14.5 5.5L8 12l6.5 6.5" : "M9.5 5.5L16 12l-6.5 6.5"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function BookReaderBottomNavigation({
  lang,
  previousBook,
  nextBook,
}: {
  lang: Lang;
  previousBook: Book | null;
  nextBook: Book | null;
}) {
  const previousDirection = lang === "he" ? "next" : "prev";
  const nextDirection = lang === "he" ? "prev" : "next";

  if (!previousBook && !nextBook) {
    return null;
  }

  return (
    <nav className="book-seo-navigation" aria-label="Book navigation">
      {previousBook ? (
        <Link
          href={buildLocalizedPublicPath(`/books/${getBookPathSlug(previousBook)}`, lang)}
          className="book-reader-nav-button book-reader-nav-button-secondary book-reader-nav-button-prev"
        >
          <span className="book-reader-nav-icon-badge">
            <ReaderNavIcon direction={previousDirection} />
          </span>
          <span className="book-reader-nav-text-group">
            <span className="book-reader-nav-caption">{lang === "he" ? "הספר הבא" : "Previous book"}</span>
            <span className="book-reader-nav-title">{previousBook.title}</span>
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className="book-reader-nav-spacer" />
      )}
      {nextBook ? (
        <Link
          href={buildLocalizedPublicPath(`/books/${getBookPathSlug(nextBook)}`, lang)}
          className="book-reader-nav-button book-reader-nav-button-secondary book-reader-nav-button-next"
        >
          <span className="book-reader-nav-text-group">
            <span className="book-reader-nav-caption">{lang === "he" ? "הספר הקודם" : "Next book"}</span>
            <span className="book-reader-nav-title">{nextBook.title}</span>
          </span>
          <span className="book-reader-nav-icon-badge">
            <ReaderNavIcon direction={nextDirection} />
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" className="book-reader-nav-spacer" />
      )}
    </nav>
  );
}

const visuallyHiddenStyle = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
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
      isCoreSeoBook: slug === "kladbishenskaya-kniga",
    },
  };
};

export default function BookPage({
  book,
  previousBook,
  nextBook,
  lang,
  isCoreSeoBook,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const seo = dict.seo.capybaras.book;
  const seoTitle = `${book.title} — ${seo.titleSuffix}`;
  const seoDescription = getBookSummary(book) || seo.defaultDescription;
  const seoPath = `/books/${getBookPathSlug(book)}`;
  const feedHref = buildLocalizedHref(`/capybara?book=${encodeURIComponent(getBookPathSlug(book))}`, lang);

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} />
      <main className="capybara-page-container">
        <nav aria-label="breadcrumb" className="book-reader-top-nav">
          <Link href={feedHref} locale={lang} className="book-reader-nav-button book-reader-nav-button-back">
            <span className="book-reader-nav-icon-badge">
              <ReaderNavIcon direction="back" />
            </span>
            <span>{BACK_TO_FEED_LABEL[lang]}</span>
          </Link>
        </nav>
        {isCoreSeoBook ? (
          <section style={visuallyHiddenStyle}>
            <h1>
              {seoTitle}
            </h1>
            <p>
              {seoDescription}
            </p>
            <CorePageLinks current="book" lang={lang} related={["home", "cats", "raccoons"]} />
          </section>
        ) : null}
        <StandaloneBookScreenPages
          book={book}
          lang={lang}
          t={t}
          bottomNavigation={(
            <BookReaderBottomNavigation
              lang={lang}
              previousBook={previousBook}
              nextBook={nextBook}
            />
          )}
        />
      </main>
    </>
  );
}
