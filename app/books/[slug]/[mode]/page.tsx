import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import StandaloneBookScreen from "@/components/StandaloneBookScreen";
import {
  buildBookPageDescription,
  getBookPathSlug,
  findBookBySlug,
  findExplanationModeBySegment,
  loadExplanationModes,
} from "@/lib/books";
import { dictionaries, type Lang } from "@/i18n";
import type { Book } from "@/types/types";

type PageProps = {
  params: Promise<{
    slug: string;
    mode: string;
  }>;
};

const MODE_LABELS: Record<string, string> = {
  plot: "Сюжет",
  idea: "Главная идея",
  ending: "Смысл финала",
  characters: "Персонажи",
  philosophy: "Философия",
  conflicts: "Конфликты",
  "20-seconds": "Книга за 20 секунд",
};

const isLang = (value: string): value is Lang =>
  value === "ru" || value === "en" || value === "he";

const getRouteLang = async (): Promise<Lang> => {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("laplapla_lang")?.value;
  return cookieLang && isLang(cookieLang) ? cookieLang : "ru";
};

const getModeLabel = (modeSegment: string) => MODE_LABELS[modeSegment] || modeSegment;

const getBookSummary = (book: Book) =>
  (typeof book.description === "string" && book.description.trim()) ||
  (typeof book.summary === "string" && book.summary.trim()) ||
  buildBookPageDescription(book);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, mode } = await params;
  const [book, modes] = await Promise.all([
    findBookBySlug(slug),
    loadExplanationModes().catch(() => []),
  ]);

  if (!book) {
    return {
      title: "Book Not Found | LapLapLa",
    };
  }

  const resolvedMode = findExplanationModeBySegment(modes, mode);
  const modeLabel = getModeLabel(mode);

  return {
    title: `${book.title} — ${resolvedMode ? modeLabel : getModeLabel(mode)} | LapLapLa`,
    description: `Объяснение книги "${book.title}" — ${modeLabel}`,
    alternates: {
      canonical: `/books/${slug}/${mode}`,
    },
  };
}

export default async function BookModePage({ params }: PageProps) {
  const [{ slug, mode }, lang] = await Promise.all([params, getRouteLang()]);
  const [book, modes] = await Promise.all([
    findBookBySlug(slug),
    loadExplanationModes().catch(() => []),
  ]);

  if (!book) {
    notFound();
  }

  const resolvedMode = findExplanationModeBySegment(modes, mode);
  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const modeLabel = getModeLabel(mode);
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
        <Link href="/capybara">Книги</Link> {"→"} <Link href={`/books/${getBookPathSlug(book)}`}>{book.title}</Link> {"→"} <span>{modeLabel}</span>
      </nav>
      <StandaloneBookScreen
        book={book}
        lang={lang}
        t={t}
        initialModeId={resolvedMode?.id ?? null}
      />
      <div className="mode-navigation">
        {Object.entries(MODE_LABELS).map(([modeSlug, label]) => (
          <Link key={modeSlug} href={`/books/${getBookPathSlug(book)}/${modeSlug}`}>
            {label}
          </Link>
        ))}
      </div>
    </main>
  );
}
