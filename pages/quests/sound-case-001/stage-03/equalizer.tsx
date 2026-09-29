import type { Lang } from "@/i18n";
import SEO from "@/components/SEO";
import { HumanEqualizerScene } from "@/components/quests/sound-case-001/HumanEqualizerScene";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { DISTRACTOR_IDS } from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";
import type { DistractorId } from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";
import { useRouter } from "next/router";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { SOUND_CASE_001_HUMAN_EQUALIZER_PUBLIC_PATH } from "@/lib/quests/soundCaseRouting";
import { SOUND_CASE_001_HUB_PUBLIC_PATH } from "@/lib/shop/quests/sound-case-001/finale";

export default function HumanEqualizerPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const text = dictionaries[lang].shop.soundCase.humanEqualizer;
  const hubReplay = router.query.from === "hub";
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
        path={SOUND_CASE_001_HUMAN_EQUALIZER_PUBLIC_PATH}
        lang={lang}
      />
      <HumanEqualizerScene
        lang={lang}
        recordingUrl={recordingUrl}
        distractorUrls={distractorUrls}
        parrotUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-parrot"])}
        hubReplay={hubReplay}
        hubHref={buildLocalizedPublicPath(SOUND_CASE_001_HUB_PUBLIC_PATH, lang)}
      />
    </>
  );
}
