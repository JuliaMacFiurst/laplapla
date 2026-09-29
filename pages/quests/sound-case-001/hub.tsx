import SEO from "@/components/SEO";
import type { GetServerSideProps } from "next";
import { SoundCaseHubScene } from "@/components/quests/sound-case-001/SoundCaseHubScene";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import { getParrotAudioUrl } from "@/lib/parrotMediaUrls";
import { loadSoundCaseHubDrawingPreview } from "@/lib/server/soundCaseHub";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { SOUND_CASE_001_HUB_PUBLIC_PATH } from "@/lib/shop/quests/sound-case-001/finale";
import { SINGING_DUNE_ARTICLE_COVER_URL } from "@/lib/quests/singingDunesArticle";

type SoundCaseHubPageProps = {
  lang: Lang;
  drawingPreviewUrl: string | null;
};

export default function SoundCaseHubPage({ lang, drawingPreviewUrl }: SoundCaseHubPageProps) {
  const text = dictionaries[lang].shop.soundCase.finale.hub;
  const assets = SOUND_CASE_001_ASSET_MANIFEST.assets;

  return (
    <>
      <SEO
        title={`${text.pageTitle} | LapLapLa`}
        description={text.metaDescription}
        path={SOUND_CASE_001_HUB_PUBLIC_PATH}
        lang={lang}
      />
      <SoundCaseHubScene
        lang={lang}
        backgroundUrl={requireQuestAssetUrl(assets["stage-7-expert-club-background"])}
        parrotUrl={requireQuestAssetUrl(assets["stage-2-parrot"])}
        singingDuneArtworkUrl={getParrotAudioUrl("parrot-style-media/styles/singing-dune/style-icon.webp")}
        wakeTheDuneIconUrl={requireQuestAssetUrl(assets["hub-wake-the-dune-icon"])}
        humanEqualizerIconUrl={requireQuestAssetUrl(assets["hub-human-equalizer-icon"])}
        articleArtworkUrl={SINGING_DUNE_ARTICLE_COVER_URL}
        drawingPreviewUrl={drawingPreviewUrl}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SoundCaseHubPageProps> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  let drawingPreviewUrl: string | null = null;

  try {
    drawingPreviewUrl = await loadSoundCaseHubDrawingPreview();
  } catch (error) {
    console.error("[sound-case-hub] failed to load drawing preview", error);
  }

  return { props: { lang, drawingPreviewUrl } };
};
