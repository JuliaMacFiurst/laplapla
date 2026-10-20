import SEO from "@/components/SEO";
import { SingingDunesArticle } from "@/components/quests/sound-case-001/SingingDunesArticle";
import type { Lang } from "@/i18n";
import { BASE_URL } from "@/lib/config";
import { buildCanonicalUrl } from "@/lib/i18n/routing";
import { ENTITY_IDS } from "@/lib/identity";
import {
  getSingingDunesArticleCopy,
  SINGING_DUNES_ARTICLE_ROUTE,
  SINGING_DUNE_ARTICLE_COVER_URL,
} from "@/lib/quests/singingDunesArticle";

export default function SingingDunesArticlePage({ lang }: { lang: Lang }) {
  const text = getSingingDunesArticleCopy(lang);
  const canonical = buildCanonicalUrl(BASE_URL, SINGING_DUNES_ARTICLE_ROUTE, lang);
  return (
    <>
      <SEO
        title={`${text.pageTitle} | LapLapLa`}
        description={text.metaDescription}
        path={SINGING_DUNES_ARTICLE_ROUTE}
        lang={lang}
        type="article"
        image={SINGING_DUNE_ARTICLE_COVER_URL}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: text.pageTitle,
          description: text.metaDescription,
          inLanguage: lang,
          url: canonical,
          mainEntityOfPage: canonical,
          image: SINGING_DUNE_ARTICLE_COVER_URL,
          publisher: { "@id": ENTITY_IDS.organization },
          isAccessibleForFree: true,
        }}
      />
      <SingingDunesArticle lang={lang} />
    </>
  );
}
