import type { Lang } from "@/i18n";
import SEO from "@/components/SEO";
import { Stage2ClueScene } from "@/components/quests/sound-case-001/Stage2ClueScene";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";

export const STAGE_2_CLUE_PUBLIC_PATH = "/quests/sound-case-001/stage-02/clue";

type Stage2CluePageProps = { lang: Lang };

export default function Stage2CluePage({ lang }: Stage2CluePageProps) {
  const text = dictionaries[lang].shop.soundCase.stage02ClueScene;
  const assets = SOUND_CASE_001_ASSET_MANIFEST.assets;

  return (
    <>
      <SEO
        title={`${text.pageTitle} | LapLapLa`}
        description={text.metaDescription}
        path={STAGE_2_CLUE_PUBLIC_PATH}
        lang={lang}
      />
      <Stage2ClueScene
        lang={lang}
        backgroundUrl={requireQuestAssetUrl(assets["stage-2-digital-background"])}
        parrotUrl={requireQuestAssetUrl(assets["stage-2-parrot"])}
        parrot2Url={requireQuestAssetUrl(assets["stage-2-digital-parrot-2"])}
        sandUrl={requireQuestAssetUrl(assets["stage-2-sand-bag"])}
      />
    </>
  );
}
