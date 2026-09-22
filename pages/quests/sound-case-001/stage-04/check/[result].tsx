import { useRouter } from "next/router";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import SEO from "@/components/SEO";
import { Stage4ResultScene } from "@/components/quests/sound-case-001/Stage4ResultScene";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { getStage4ResultKind } from "@/lib/shop/quests/sound-case-001/brokenRhythm";

export default function Stage4CheckPage({ lang, personalization }: { lang: Lang; personalization?: QuestPersonalization }) {
  const router = useRouter();
  const result = getStage4ResultKind(router.query.result);
  const text = dictionaries[lang].shop.soundCase.stage04.digital;
  if (!result) return null;
  const resultSlug = result === "correct" ? "correct" : Array.isArray(router.query.result) ? router.query.result[0] : router.query.result;
  const path = `/quests/sound-case-001/stage-04/check/${resultSlug}`;
  return <>
    <SEO title={`${text.pageTitle} | LapLapLa`} description={text.metaDescription} path={path} lang={lang} />
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
