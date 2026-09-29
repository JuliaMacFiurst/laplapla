import SEO from "@/components/SEO";
import { SingingDunesArticle } from "@/components/quests/sound-case-001/SingingDunesArticle";
import type { Lang } from "@/i18n";
import { getSingingDunesArticleCopy, SINGING_DUNES_ARTICLE_ROUTE } from "@/lib/quests/singingDunesArticle";

export default function SingingDunesArticlePage({ lang }: { lang: Lang }) {
  const text = getSingingDunesArticleCopy(lang);
  return (
    <>
      <SEO title={`${text.pageTitle} | LapLapLa`} description={text.metaDescription} path={SINGING_DUNES_ARTICLE_ROUTE} lang={lang} />
      <SingingDunesArticle lang={lang} />
    </>
  );
}
