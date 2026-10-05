import type { GetServerSideProps } from "next";
import LibraryExperience from "@/components/library/LibraryExperience";
import type { Lang } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import { loadLibraryItems, type LibraryItem } from "@/lib/library";

export default function LibraryPage({ lang, items }: { lang: Lang; items: LibraryItem[] }) {
  return <LibraryExperience lang={lang} items={items} />;
}

export const getServerSideProps: GetServerSideProps = async ({ locale, query }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const items = await loadLibraryItems({
    locale: lang,
    query: typeof query.q === "string" ? query.q : undefined,
    category: typeof query.category === "string" ? query.category : undefined,
    contentType: query.type === "video" || query.type === "image" || query.type === "slideshow" ? query.type : undefined,
    limit: 100,
  }).catch((error) => {
    console.error("[library] failed to load items", error);
    return [];
  });
  return { props: { lang, items } };
};
