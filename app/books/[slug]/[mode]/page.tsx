import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import StandaloneBookScreen from "@/components/StandaloneBookScreen";
import {
  buildBookModePageTitle,
  buildBookPageDescription,
  findBookBySlug,
  findExplanationModeBySegment,
  loadExplanationModes,
} from "@/lib/books";
import { dictionaries, type Lang } from "@/i18n";

type PageProps = {
  params: Promise<{
    slug: string;
    mode: string;
  }>;
};

const isLang = (value: string): value is Lang =>
  value === "ru" || value === "en" || value === "he";

const getRouteLang = async (): Promise<Lang> => {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("laplapla_lang")?.value;
  return cookieLang && isLang(cookieLang) ? cookieLang : "ru";
};

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

  return {
    title: buildBookModePageTitle(book, resolvedMode),
    description: buildBookPageDescription(book),
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

  return (
    <main className="capybara-page-container">
      <StandaloneBookScreen
        book={book}
        lang={lang}
        t={t}
        initialModeId={resolvedMode?.id ?? null}
      />
    </main>
  );
}
