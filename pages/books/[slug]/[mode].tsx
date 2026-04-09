import Link from "next/link";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import SEO from "@/components/SEO";
import StandaloneBookScreenPages from "@/components/StandaloneBookScreenPages";
import {
  findExplanationModeBySegment,
  getBookPathSlug,
  getLocalizedExplanationModeLabel,
} from "@/lib/books/shared";
import { buildLocalizedHref, isLang } from "@/lib/i18n/routing";
import { dictionaries, type Lang } from "@/i18n";
import type { Book, ExplanationMode } from "@/types/types";

type Props = {
  book: Book;
  lang: Lang;
  initialModeId: string | number | null;
  currentModeLabel: string;
  modeSegment: string;
};

const MODE_FALLBACK_LABELS: Record<string, Record<Lang, string>> = {
  plot: { ru: "Сюжет", en: "Plot", he: "עלילה" },
  idea: { ru: "Главная идея", en: "Main idea", he: "רעיון מרכזי" },
  ending: { ru: "Смысл финала", en: "Ending meaning", he: "משמעות הסיום" },
  characters: { ru: "Персонажи", en: "Characters", he: "דמויות" },
  philosophy: { ru: "Философия", en: "Philosophy", he: "פילוסופיה" },
  conflicts: { ru: "Конфликты", en: "Conflicts", he: "קונפליקטים" },
  "20-seconds": { ru: "Книга за 20 секунд", en: "Book in 20 seconds", he: "ספר ב-20 שניות" },
};

const BOOKS_LABEL: Record<Lang, string> = {
  ru: "Книги",
  en: "Books",
  he: "ספרים",
};

const getModeLabel = (modeSegment: string, lang: Lang) => MODE_FALLBACK_LABELS[modeSegment]?.[lang] || modeSegment;

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { findBookBySlug, loadExplanationModes } = await import("@/lib/books");
  const slug = typeof context.params?.slug === "string" ? context.params.slug : "";
  const mode = typeof context.params?.mode === "string" ? context.params.mode : "";
  const lang = isLang(context.locale) ? context.locale : isLang(context.query.lang) ? context.query.lang : "ru";
  const [book, modes] = await Promise.all([
    findBookBySlug(slug, lang),
    loadExplanationModes().catch(() => [] as ExplanationMode[]),
  ]);

  if (!book) {
    return { notFound: true };
  }

  const resolvedMode = findExplanationModeBySegment(modes, mode);
  const currentModeLabel = resolvedMode ? getLocalizedExplanationModeLabel(resolvedMode, lang) : getModeLabel(mode, lang);

  return {
    props: {
      book,
      lang,
      initialModeId: resolvedMode?.id ?? null,
      currentModeLabel,
      modeSegment: mode,
    },
  };
};

export default function BookModePage({
  book,
  lang,
  initialModeId,
  currentModeLabel,
  modeSegment,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const seo = dict.seo.capybaras.book;
  const seoTitle = `${book.title} — ${currentModeLabel}`;
  const seoDescription = book.description?.trim() || `${currentModeLabel} — ${seo.modeDescription}`;
  const seoPath = `/books/${getBookPathSlug(book)}/${modeSegment}`;
  const breadcrumbArrow = lang === "he" ? "←" : "→";

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} />
      <main className="capybara-page-container">
        <nav aria-label="breadcrumb">
          <Link href={buildLocalizedHref("/capybara", lang)}>{BOOKS_LABEL[lang]}</Link> {breadcrumbArrow} <Link href={buildLocalizedHref(`/books/${getBookPathSlug(book)}`, lang)}>{book.title}</Link> {breadcrumbArrow} <span>{currentModeLabel}</span>
        </nav>
        <StandaloneBookScreenPages
          book={book}
          lang={lang}
          t={t}
          initialModeId={initialModeId}
        />
      </main>
    </>
  );
}
