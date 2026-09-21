import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestDocument } from "@/components/shop/QuestDocument";
import { dictionaries, type Lang } from "@/i18n";
import { getSoundCase001Stage2Pages } from "@/lib/shop/questDocument";
import { requireQuestAssetUrl } from "@/lib/shop/questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "@/lib/shop/quests/sound-case-001/assets";
import {
  SOUND_CASE_001_STAGE_2_BOX,
  SOUND_CASE_001_STAGE_2_CARDS,
  SOUND_CASE_001_STAGE_2_CLUE_CARD,
  SOUND_CASE_001_STAGE_2_INTRO_CARD,
  SOUND_CASE_001_STAGE_2_PHRASES,
  STAGE_2_A4_SIZE_MM,
  STAGE_2_CLUE_CARD_SIZE_MM,
  STAGE_2_CLUE_QR_ASSET_PATH,
  STAGE_2_CLUE_QR_DESTINATION,
  STAGE_2_FRONT_PACKING_MM,
  STAGE_2_INTRO_CARD_SIZE_MM,
  STAGE_2_SOURCE_HEIGHT_PX,
  STAGE_2_SOURCE_WIDTH_PX,
  STAGE_2_VIBRATING_CARD_SIZE_MM,
  getStage2FrontCards,
  getStage2VibratingCardPositionMm,
} from "@/lib/shop/quests/sound-case-001/vibratingCards";

const locales = ["ru", "en", "he"] as const;

function renderStage2(locale: Lang) {
  return renderToStaticMarkup(
    createElement(QuestDocument, {
      personalization: { locale, leadName: "Maya", participants: [] },
      pages: getSoundCase001Stage2Pages(locale),
      assetManifest: SOUND_CASE_001_ASSET_MANIFEST,
    }),
  );
}

describe("Sound Case #001 Stage 02 printable kit", () => {
  it("keeps locale-specific card counts and phrases without filler cards", () => {
    expect(SOUND_CASE_001_STAGE_2_CARDS.ru).toHaveLength(8);
    expect(SOUND_CASE_001_STAGE_2_CARDS.en).toHaveLength(9);
    expect(SOUND_CASE_001_STAGE_2_CARDS.he).toHaveLength(8);
    expect(SOUND_CASE_001_STAGE_2_PHRASES).toEqual({
      ru: "ВИБРАЦИЯ ПЕСКА",
      en: "VIBRATION OF SAND",
      he: "תנודות בחול",
    });
    expect(new Set(SOUND_CASE_001_STAGE_2_CARDS.en.map((card) => card.id)).size).toBe(9);
    expect(JSON.stringify(SOUND_CASE_001_STAGE_2_CARDS)).not.toMatch(/filler|placeholder|fake/i);
  });

  it("models INTRO and CLUE as separate semantic objects", () => {
    expect(SOUND_CASE_001_STAGE_2_INTRO_CARD.id).toBe("stage-2-intro-card");
    expect(SOUND_CASE_001_STAGE_2_CLUE_CARD.id).toBe("stage-2-clue-card");
    expect(JSON.stringify(SOUND_CASE_001_STAGE_2_CARDS)).not.toContain("stage-2-intro-card");
    expect(JSON.stringify(SOUND_CASE_001_STAGE_2_CARDS)).not.toContain("stage-2-clue-card");
    expect(SOUND_CASE_001_STAGE_2_CLUE_CARD.frontPositionMm).toEqual({ x: 145, y: 16 });
    expect(SOUND_CASE_001_STAGE_2_CLUE_CARD.backPositionMm).toEqual({ x: 5, y: 16 });
    expect(SOUND_CASE_001_STAGE_2_CLUE_CARD.duplexMode).toBe("flip-long-edge");
  });

  it("resolves every production asset through the typed manifest", () => {
    const expectedDirectory = { ru: "/cards/rus/", en: "/cards/eng/", he: "/cards/he/" } as const;
    for (const locale of locales) {
      for (const card of SOUND_CASE_001_STAGE_2_CARDS[locale]) {
        const url = requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets[card.illustrationAssetId]);
        expect(url).toContain("https://media.laplapla.com/quests/sound-case-001/stage-02-vibrating-cards");
        expect(url).toContain(expectedDirectory[locale]);
        expect(url).toMatch(/\.webp$/);
      }
    }
    const englishUrls = SOUND_CASE_001_STAGE_2_CARDS.en.map((card) =>
      requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets[card.illustrationAssetId]),
    );
    expect(englishUrls.every((url) => !/card-\d\d-/.test(url))).toBe(true);
    expect(requireQuestAssetUrl(SOUND_CASE_001_ASSET_MANIFEST.assets["stage-2-parrot"]))
      .toBe("https://media.laplapla.com/quests/sound-case-001/stage-02-vibrating-cards/assets/parrot.webp");
  });

  it("uses image-shaped vibrating cards, separate portrait text cards, and a mixed-size 11-card box", () => {
    expect(STAGE_2_SOURCE_WIDTH_PX).toBe(1669);
    expect(STAGE_2_SOURCE_HEIGHT_PX).toBe(942);
    expect(STAGE_2_VIBRATING_CARD_SIZE_MM).toEqual({ width: 67, height: 37.82 });
    expect(STAGE_2_VIBRATING_CARD_SIZE_MM.width / STAGE_2_VIBRATING_CARD_SIZE_MM.height)
      .toBeCloseTo(STAGE_2_SOURCE_WIDTH_PX / STAGE_2_SOURCE_HEIGHT_PX, 3);
    expect(STAGE_2_INTRO_CARD_SIZE_MM).toEqual({ width: 60, height: 80 });
    expect(STAGE_2_CLUE_CARD_SIZE_MM).toEqual({ width: 60, height: 80 });
    expect(SOUND_CASE_001_STAGE_2_BOX.maxCardCount).toBe(11);
    expect(SOUND_CASE_001_STAGE_2_BOX.cardstockModel).toEqual({
      recommendedGsm: [200, 300],
      conservativeCaliperMm: 0.4,
      estimatedStackDepthMm: 4.4,
    });
    expect(SOUND_CASE_001_STAGE_2_BOX.largestObjectSizeMm).toEqual({ width: 67, height: 80 });
    expect(SOUND_CASE_001_STAGE_2_BOX.clearanceMm).toEqual({ x: 6, y: 6, z: 3.6 });
    expect(SOUND_CASE_001_STAGE_2_BOX.internalSizeMm).toEqual({ width: 73, height: 86, depth: 8 });
    expect(SOUND_CASE_001_STAGE_2_BOX.dielineSizeMm).toEqual({ width: 172, height: 146 });
    for (const size of [STAGE_2_VIBRATING_CARD_SIZE_MM, STAGE_2_INTRO_CARD_SIZE_MM, STAGE_2_CLUE_CARD_SIZE_MM]) {
      expect(SOUND_CASE_001_STAGE_2_BOX.internalSizeMm.width - size.width).toBeGreaterThanOrEqual(6);
      expect(SOUND_CASE_001_STAGE_2_BOX.internalSizeMm.height - size.height).toBeGreaterThanOrEqual(6);
    }
    expect(SOUND_CASE_001_STAGE_2_BOX.internalSizeMm.depth).toBeGreaterThan(
      SOUND_CASE_001_STAGE_2_BOX.cardstockModel.estimatedStackDepthMm,
    );
    expect(
      SOUND_CASE_001_STAGE_2_BOX.glueFlapWidthMm +
      SOUND_CASE_001_STAGE_2_BOX.internalSizeMm.depth * 2 +
      SOUND_CASE_001_STAGE_2_BOX.internalSizeMm.width * 2,
    ).toBe(SOUND_CASE_001_STAGE_2_BOX.dielineSizeMm.width);
  });

  it.each(locales)("uses the optimal three-page / two-sheet %s composition", (locale) => {
    const pages = getSoundCase001Stage2Pages(locale);
    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.type)).toEqual([
      "stage-2-vibrating-cards",
      "stage-2-clue-back",
      "stage-2-box",
    ]);
    expect(getStage2FrontCards(locale)).toHaveLength(locale === "en" ? 9 : 8);
    expect(pages[0]).toMatchObject({ side: "front", pairId: "stage-2-clue-sheet", duplexMode: "flip-long-edge" });
    expect(pages[1]).toMatchObject({ side: "back", pairId: "stage-2-clue-sheet", duplexMode: "flip-long-edge" });
    expect(pages[2]).toMatchObject({ side: "single", includesOverflowVibratingCard: false });

    const html = renderStage2(locale);
    expect(html.match(/data-page-id=/g)).toHaveLength(3);
    expect(html.match(/data-rendering-role="stage-2-vibrating-card"/g)).toHaveLength(
      SOUND_CASE_001_STAGE_2_CARDS[locale].length,
    );
    expect(html.match(/data-rendering-role="stage-2-intro"/g)).toHaveLength(1);
    expect(html.match(/data-rendering-role="stage-2-clue-front"/g)).toHaveLength(1);
    expect(html.match(/data-rendering-role="stage-2-clue-back"/g)).toHaveLength(1);
    expect(html).not.toContain("standalone-information");
  });

  it("packs every landscape card and the portrait clue within A4 safe margins without collisions", () => {
    const cardRects = Array.from({ length: 9 }, (_, index) => ({
      ...getStage2VibratingCardPositionMm(index),
      ...STAGE_2_VIBRATING_CARD_SIZE_MM,
    }));
    const clue = { x: STAGE_2_FRONT_PACKING_MM.clueX, y: STAGE_2_FRONT_PACKING_MM.clueY, ...STAGE_2_CLUE_CARD_SIZE_MM };
    const rects = [...cardRects, clue];
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(5);
      expect(rect.y).toBeGreaterThanOrEqual(5);
      expect(rect.x + rect.width).toBeLessThanOrEqual(STAGE_2_A4_SIZE_MM.width - 5);
      expect(rect.y + rect.height).toBeLessThanOrEqual(STAGE_2_A4_SIZE_MM.height - 5);
    }
    for (let first = 0; first < rects.length; first += 1) {
      for (let second = first + 1; second < rects.length; second += 1) {
        const a = rects[first];
        const b = rects[second];
        expect(a.x + a.width <= b.x - 2 || b.x + b.width <= a.x - 2 || a.y + a.height <= b.y - 2 || b.y + b.height <= a.y - 2).toBe(true);
      }
    }
    expect(SOUND_CASE_001_STAGE_2_CLUE_CARD.backPositionMm.x)
      .toBe(STAGE_2_A4_SIZE_MM.width - clue.x - clue.width);
  });

  it.each(locales)("keeps the clue answer on the front only in %s", (locale) => {
    const html = renderStage2(locale);
    const frontStart = html.indexOf('data-page-type="stage-2-vibrating-cards"');
    const backStart = html.indexOf('data-page-type="stage-2-clue-back"');
    const boxStart = html.indexOf('data-page-type="stage-2-box"');
    const front = html.slice(frontStart, backStart);
    const back = html.slice(backStart, boxStart);
    expect(front).toContain(SOUND_CASE_001_STAGE_2_PHRASES[locale]);
    expect(front).toContain(`data-qr-destination="${STAGE_2_CLUE_QR_DESTINATION}"`);
    expect(front).toContain(`src="${STAGE_2_CLUE_QR_ASSET_PATH}"`);
    expect(back).not.toContain(SOUND_CASE_001_STAGE_2_PHRASES[locale]);
    for (const line of dictionaries[locale].shop.soundCase.stage02.clue.backWarning) {
      expect(back).toContain(line);
    }
  });

  it("keeps Hebrew RTL inside artwork while sheet geometry stays LTR", () => {
    const html = renderStage2("he");
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");
    expect(html).toContain('<bdi dir="rtl">תנודות בחול</bdi>');
    expect(html).toContain('lang="he"');
    expect(html).toContain('dir="rtl"');
    expect(css).toMatch(/\.quest-sound-cards-sheet__grid\s*\{[\s\S]*?direction: ltr/);
    expect(css).toMatch(/\.quest-stage-2-box-artwork\s*\{[\s\S]*?direction: ltr/);
  });

  it("keeps the real QR, A4 print contract, safe cut areas, and unmodified image fitting", () => {
    const qr = readFileSync(`${process.cwd()}/public${STAGE_2_CLUE_QR_ASSET_PATH}`, "utf8");
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");
    expect(qr).toContain('viewBox="0 0 45 45"');
    expect(qr).toContain('shape-rendering="crispEdges"');
    expect(qr).toContain('fill="#ffffff"');
    expect(qr).toContain('stroke="#000000"');
    expect(css).toContain("size: A4 portrait");
    expect(css).toContain("width: 210mm !important");
    expect(css).toContain("height: 297mm !important");
    expect(css).toMatch(/\.quest-stage-2-vibrating-card\s*\{[\s\S]*?width: 67mm;[\s\S]*?height: auto;/);
    expect(css).toMatch(/\.quest-stage-2-vibrating-card img\s*\{[\s\S]*?width: 100%;[\s\S]*?height: auto;[\s\S]*?transform: none;[\s\S]*?filter: none;/);
    expect(css).not.toContain("quest-stage-2-vibrating-card__landscape");
    expect(renderStage2("ru")).toContain('data-gameplay-orientation="landscape"');
    expect(renderStage2("ru")).toContain('class="quest-stage-2-intro-card quest-stage-2-intro-card--ru"');
    expect(renderStage2("ru")).toContain('quest-stage-2-clue--front quest-stage-2-clue--ru');
    expect(renderStage2("ru")).toContain('data-cut-width-mm="67" data-cut-height-mm="37.82"');
    expect(dictionaries.ru.shop.soundCase.stage02.printHelp.actualSize).toContain("100% / Actual Size");
  });
});
