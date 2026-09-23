import SEO from "@/components/SEO";
import { SoundCodeScene } from "@/components/quests/sound-case-001/SoundCodeScene";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import type { QuestPersonalization } from "@/lib/shop/questPersonalization";
import { STAGE_6_PUBLIC_PATH } from "@/lib/shop/quests/sound-case-001/scatteredSand";
import { SOUND_CODE_DIGITS } from "@/lib/shop/quests/sound-case-001/soundCode";
export default function SoundCodePage({lang,personalization}:{lang:Lang;personalization?:QuestPersonalization}){const t=dictionaries[lang].shop.soundCase.stage06;const audioUrls=Object.fromEntries(SOUND_CODE_DIGITS.map(({digit,assetId})=>[digit,requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets[assetId])])) as Record<(typeof SOUND_CODE_DIGITS)[number]["digit"],string>;return <><SEO title={`${t.pageTitle} | LapLapLa`} description={t.metaDescription} path={STAGE_6_PUBLIC_PATH} lang={lang}/><SoundCodeScene lang={lang} leadName={personalization?.leadName} backgroundUrl={requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-5-dune-background"])} parrotUrls={[requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-parrot"]),requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-digital-parrot-2"])]} audioUrls={audioUrls}/></>}
