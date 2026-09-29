import SEO from "@/components/SEO";
import { SoundCaseSolvedScene } from "@/components/quests/sound-case-001/SoundCaseSolvedScene";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { SOUND_CASE_001_SOLVED_PUBLIC_PATH } from "@/lib/shop/quests/sound-case-001/finale";

export default function SoundCaseSolvedPage({ lang }: { lang: Lang }) {
  const text = dictionaries[lang].shop.soundCase.finale.solved;
  const assets = SOUND_CASE_001_ASSET_MANIFEST.assets;

  return (
    <>
      <SEO
        title={`${text.pageTitle} | LapLapLa`}
        description={text.metaDescription}
        path={SOUND_CASE_001_SOLVED_PUBLIC_PATH}
        lang={lang}
      />
      <SoundCaseSolvedScene
        lang={lang}
        victoryImageUrl={requireQuestAssetUrl(assets["finale-victory"])}
        collectibleCardsImageUrl={requireQuestAssetUrl(assets["finale-collectible-cards"])}
        soundtrackUrl={requireQuestAssetUrl(assets["finale-victory-soundtrack"])}
      />
    </>
  );
}
