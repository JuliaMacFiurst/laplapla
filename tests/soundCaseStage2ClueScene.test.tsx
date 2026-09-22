import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Stage2ClueScene, STAGE_3_EQUALIZER_PATH } from "@/components/quests/sound-case-001/Stage2ClueScene";
import { dictionaries } from "@/i18n";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import { STAGE_2_CLUE_PUBLIC_PATH } from "@/pages/quests/sound-case-001/stage-02/clue";

const assets = SOUND_CASE_001_ASSET_MANIFEST.assets;
const base = "https://media.laplapla.com/quests/sound-case-001/stage-02-vibrating-cards/assets/";
const sceneAssets = {
  backgroundUrl: requireQuestAssetUrl(assets["stage-2-digital-background"]),
  parrotUrl: requireQuestAssetUrl(assets["stage-2-parrot"]),
  parrot2Url: requireQuestAssetUrl(assets["stage-2-digital-parrot-2"]),
  sandUrl: requireQuestAssetUrl(assets["stage-2-sand-bag"]),
};

describe("Sound Case #001 Stage 02 digital clue", () => {
  it("keeps its stable QR route and resolves only typed production assets", () => {
    expect(STAGE_2_CLUE_PUBLIC_PATH).toBe("/quests/sound-case-001/stage-02/clue");
    expect(sceneAssets).toEqual({
      backgroundUrl: `${base}stage-2-clue-sand-studio-background.webp`,
      parrotUrl: `${base}parrot.webp`,
      parrot2Url: `${base}parrot2.webp`,
      sandUrl: `${base}sand.webp`,
    });
    expect(STAGE_3_EQUALIZER_PATH).toBe("/quests/sound-case-001/stage-03/equalizer");
  });

  it.each(["ru", "en", "he"] as const)("renders %s copy, artwork, CTA and secondary science disclosure", (lang) => {
    const text = dictionaries[lang].shop.soundCase.stage02ClueScene;
    const html = renderToStaticMarkup(createElement(Stage2ClueScene, { lang, ...sceneAssets }));

    expect(html).toContain(`<main class="stage-2-clue-scene" lang="${lang}" dir="${lang === "he" ? "rtl" : "ltr"}">`);
    expect(html).toContain(text.heading);
    for (const line of text.speech) expect(html).toContain(line);
    expect(html).toContain(`href="${STAGE_3_EQUALIZER_PATH}"`);
    expect(html).toContain(text.equalizerAction);
    expect(html).toContain("<details");
    expect(html).toContain(text.adultBonusQuestion);
    expect(html).toContain(text.adultBonusExplanation);
    expect(html).toContain(sceneAssets.parrotUrl);
    expect(html).toContain(sceneAssets.parrot2Url);
    expect(html).toContain(sceneAssets.sandUrl);
  });
});
