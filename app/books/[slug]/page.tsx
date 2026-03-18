import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import StandaloneBookScreen from "@/components/StandaloneBookScreen";
import { buildBookPageDescription, buildBookPageTitle, findBookBySlug } from "@/lib/books";
import { dictionaries, type Lang } from "@/i18n";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await findBookBySlug(slug);

  if (!book) {
    return {
      title: "Book Not Found | LapLapLa",
    };
  }

  return {
    title: buildBookPageTitle(book),
    description: buildBookPageDescription(book),
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

  return (
    <main className="capybara-page-container">
      <StandaloneBookScreen book={book} lang={lang} t={t} />
    </main>
  );
}
