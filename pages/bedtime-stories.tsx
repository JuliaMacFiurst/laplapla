import type { GetServerSideProps } from "next";
import BedtimeStoriesLibrary from "@/components/bedtime/BedtimeStoriesLibrary";
import type { Lang } from "@/i18n";
import { loadBedtimeStories, type BedtimeStory } from "@/lib/bedtimeStories";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";

type BedtimeStoriesPageProps = {
  lang: Lang;
  stories: BedtimeStory[];
};

export default function BedtimeStoriesPage({ lang, stories }: BedtimeStoriesPageProps) {
  return <BedtimeStoriesLibrary lang={lang} stories={stories} />;
}

export const getServerSideProps: GetServerSideProps<BedtimeStoriesPageProps> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const stories = await loadBedtimeStories(lang).catch((error) => {
    console.error("[bedtime-stories] failed to load stories", error);
    return [];
  });

  return {
    props: {
      lang,
      stories,
    },
  };
};
