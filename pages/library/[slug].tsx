import type { GetServerSideProps } from "next";
import LibraryExperience from "@/components/library/LibraryExperience";
import type { Lang } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import { loadLibraryItemBySlug, loadLibraryItems, type LibraryItem } from "@/lib/library";

type Props = { lang: Lang; items: LibraryItem[]; item: LibraryItem };

export async function resolveLibraryItemPageProps(
  slug: string,
  lang: Lang,
  loaders = { loadItem: loadLibraryItemBySlug, loadItems: loadLibraryItems },
) {
  const item = await loaders.loadItem(slug, lang);
  if (!item) return null;
  const items = await loaders.loadItems({ locale: lang, limit: 100 }).catch(() => [item]);
  return { lang, items, item };
}

export default function LibraryItemPage({ lang, items, item }: Props) {
  return <LibraryExperience lang={lang} items={items} selectedItem={item} />;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ locale, params }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const props = await resolveLibraryItemPageProps(slug, lang).catch((error) => {
    console.error("[library] failed to load item", error);
    return null;
  });
  return props ? { props } : { notFound: true };
};
