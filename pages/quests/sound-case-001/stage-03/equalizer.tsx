import type { Lang } from "@/i18n";
import SEO from "@/components/SEO";
import { HumanEqualizerScene } from "@/components/quests/sound-case-001/HumanEqualizerScene";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { DISTRACTOR_IDS } from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";
import type { DistractorId } from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";

export const HUMAN_EQUALIZER_PUBLIC_PATH = "/quests/sound-case-001/stage-03/equalizer";

export default function HumanEqualizerPage({ lang }: { lang: Lang }) {
  const text = dictionaries[lang].shop.soundCase.humanEqualizer;
  const recordingUrl = requireQuestAssetUrl(
    SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"],
  );
  const distractorUrls = Object.fromEntries(DISTRACTOR_IDS.map((id) => [
    id,
    requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets[`stage-3-distractor-${id}`]),
  ])) as Record<DistractorId, string>;

  return (
    <>
      <SEO
        title={`${text.pageTitle} | LapLapLa`}
        description={text.metaDescription}
        path={HUMAN_EQUALIZER_PUBLIC_PATH}
        lang={lang}
      />
      <HumanEqualizerScene
        lang={lang}
        recordingUrl={recordingUrl}
        distractorUrls={distractorUrls}
        parrotUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-parrot"])}
      />
    </>
  );
}
