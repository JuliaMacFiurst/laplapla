import type { GetServerSideProps } from "next";

import BedtimeStoriesLibrary from "@/components/bedtime/BedtimeStoriesLibrary";
import type { Lang } from "@/i18n";
import {
  loadBedtimeStories,
  loadBedtimeStoryBySlug,
  type BedtimeStory,
} from "@/lib/bedtimeStories";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";

type BedtimeStoryPageProps = {
  lang: Lang;
  stories: BedtimeStory[];
  story: BedtimeStory;
};

type StoryPageLoaders = {
  loadStory: typeof loadBedtimeStoryBySlug;
  loadStories: typeof loadBedtimeStories;
};

export async function resolveBedtimeStoryPageProps(
  slug: string,
  lang: Lang,
  loaders: StoryPageLoaders = { loadStory: loadBedtimeStoryBySlug, loadStories: loadBedtimeStories },
) {
  const story = await loaders.loadStory(slug, lang);
  if (!story) return null;
  const stories = await loaders.loadStories(lang).catch(() => [story]);
  return { lang, stories, story };
}

export default function BedtimeStoryPage({ lang, stories, story }: BedtimeStoryPageProps) {
  return <BedtimeStoriesLibrary lang={lang} stories={stories} selectedStory={story} />;
}

export const getServerSideProps: GetServerSideProps<BedtimeStoryPageProps> = async ({ locale, params }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const props = await resolveBedtimeStoryPageProps(slug, lang).catch((error) => {
    console.error("[bedtime-stories] failed to load story", error);
    return null;
  });

  if (!props) {
    return { notFound: true };
  }
  return { props };
};
