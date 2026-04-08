import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import SeoEntityPage, { type GroupedStories } from "@/components/SeoEntityPage";
import { isLang } from "@/lib/i18n/routing";
import { loadSeoEntityPageData } from "@/lib/server/seoEntityPage";
import type { Lang } from "@/i18n";

type Props = {
  title: string;
  groupedStories: GroupedStories;
  lang: Lang;
};

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const slug = typeof context.params?.slug === "string" ? context.params.slug : "";
  const lang = isLang(context.locale) ? context.locale : isLang(context.query.lang) ? context.query.lang : "ru";

  if (!slug) {
    return { notFound: true };
  }

  const { title, groupedStories, hasAnyStories } = await loadSeoEntityPageData("country", slug, lang);
  if (!hasAnyStories) {
    return { notFound: true };
  }

  return {
    props: {
      title,
      groupedStories,
      lang,
    },
  };
};

export default function CountrySeoPage({
  title,
  groupedStories,
  lang,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <SeoEntityPage entityType="country" title={title} groupedStories={groupedStories} lang={lang} />;
}
