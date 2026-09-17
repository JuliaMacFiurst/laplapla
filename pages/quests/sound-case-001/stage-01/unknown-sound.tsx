import type { Lang } from "@/i18n";
import SEO from "@/components/SEO";
import { UnknownSoundScene } from "@/components/quests/sound-case-001/UnknownSoundScene";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";

export const UNKNOWN_SOUND_PUBLIC_PATH =
  "/quests/sound-case-001/stage-01/unknown-sound";

type UnknownSoundPageProps = {
  lang: Lang;
};

export default function UnknownSoundPage({ lang }: UnknownSoundPageProps) {
  const text = dictionaries[lang].shop.soundCase.unknownSoundScene;
  const audioUrl = requireQuestAssetUrl(
    SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"],
  );
  const parrotUrl = requireQuestAssetUrl(
    SOUND_CASE_001_ASSET_MANIFEST.assets["sound-lab-parrot"],
  );

  return (
    <>
      <SEO
        title={`${text.pageTitle} | LapLapLa`}
        description={text.metaDescription}
        path={UNKNOWN_SOUND_PUBLIC_PATH}
        lang={lang}
      />
      <UnknownSoundScene
        lang={lang}
        audioUrl={audioUrl}
        parrotUrl={parrotUrl}
      />
    </>
  );
}
