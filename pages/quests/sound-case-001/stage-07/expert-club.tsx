import SEO from "@/components/SEO";
import { ExpertClubHost } from "@/components/quests/sound-case-001/ExpertClubHost";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { STAGE_7_PUBLIC_PATH } from "@/lib/shop/quests/sound-case-001/expertClub";

export default function ExpertClubPage({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].shop.soundCase.stage07;
  const backgroundAsset = SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-expert-club-background"];
  const backgroundUrl = requireQuestAssetUrl(backgroundAsset);
  return <><SEO title={`${t.pageTitle} | LapLapLa`} description={t.metaDescription} path={STAGE_7_PUBLIC_PATH} lang={lang}/><ExpertClubHost lang={lang} parrotUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-parrot"])} backgroundUrl={backgroundUrl} bonusVisualUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-dune-sliding-experiment"])} duneAudioUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-singing-sand-dune"])} victoryAudioUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-7-victory-fanfare"])}/></>;
}
