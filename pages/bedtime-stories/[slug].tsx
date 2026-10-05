import type { GetServerSideProps } from "next";

import { buildLocalizedPublicPath, DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import type { Lang } from "@/i18n";
import { loadBedtimeStories, loadBedtimeStoryBySlug } from "@/lib/bedtimeStories";

// Kept as a pure compatibility helper for existing regression tests and callers.
export async function resolveBedtimeStoryPageProps(
  slug: string,
  lang: Lang,
  loaders = { loadStory: loadBedtimeStoryBySlug, loadStories: loadBedtimeStories },
) {
  const story = await loaders.loadStory(slug, lang);
  if (!story) return null;
  const stories = await loaders.loadStories(lang).catch(() => [story]);
  return { lang, stories, story };
}

export default function LegacyBedtimeStoryPage() { return null; }

export const getServerSideProps: GetServerSideProps = async ({ locale, params }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  const slug = typeof params?.slug === "string" ? params.slug : "";
  return { redirect: { destination: buildLocalizedPublicPath(`/library/${slug}`, lang), permanent: true } };
};
