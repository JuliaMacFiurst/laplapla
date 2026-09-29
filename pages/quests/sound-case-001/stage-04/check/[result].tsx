import type { GetServerSideProps } from "next";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import SEO from "@/components/SEO";
import { Stage4ResultScene } from "@/components/quests/sound-case-001/Stage4ResultScene";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { getStage4ResultKind } from "@/lib/shop/quests/sound-case-001/brokenRhythm";

type Stage4CheckPageProps = {
  lang: Lang;
  resultSlug: string;
  personalization?: QuestPersonalization;
};

export default function Stage4CheckPage({ lang, resultSlug, personalization }: Stage4CheckPageProps) {
  const result = getStage4ResultKind(resultSlug);
  const text = dictionaries[lang].shop.soundCase.stage04.digital;
  if (!result) return null;
  const path = `/quests/sound-case-001/stage-04/check/${resultSlug}`;
  return <>
    <SEO title={`${text.pageTitle} | LapLapLa`} description={text.metaDescription} path={path} lang={lang} noindex noindexFollow />
    <Stage4ResultScene
      lang={lang}
      result={result}
      personalization={personalization}
      parrotUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-parrot"])}
      clapOutOfSyncUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-4-clap-out-of-sync"])}
      clapTogetherUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-4-clap-together"])}
    />
  </>;
}

export const getServerSideProps: GetServerSideProps<Stage4CheckPageProps> = async ({ locale, params }) => {
  const resultParam = params?.result;
  const resultSlug = Array.isArray(resultParam) ? resultParam[0] : resultParam;
  if (!resultSlug || !getStage4ResultKind(resultSlug)) {
    return { notFound: true };
  }

  return {
    props: {
      lang: isLang(locale) ? locale : DEFAULT_LANG,
      resultSlug,
    },
  };
};
