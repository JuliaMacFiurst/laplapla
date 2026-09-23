import { describe, expect, expectTypeOf, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestDocument } from "@/components/shop/QuestDocument";
import { QuestPreview } from "@/components/shop/QuestPreview";
import { renderQuestPageDefinition } from "@/components/shop/questPageRenderers";
import { dictionaries, type Lang } from "@/i18n";
import {
  getProductBySlug,
  getPublicProducts,
  getPurchasableProducts,
} from "@/lib/shop/catalog";
import {
  SOUND_CASE_001_PAGES,
  getPrintableQuestPages,
  type QuestPageDefinition,
  type QuestPageType,
  type Stage1CardBoxPageDefinition,
  type SoundCardBacksPageDefinition,
  type SoundCardsPageDefinition,
} from "@/lib/shop/questDocument";
import {
  getOptionalQuestAssetUrl,
  requireQuestAssetUrl,
} from "@/lib/shop/questAssets";
import {
  MAX_QUEST_PARTICIPANTS,
  addQuestParticipant,
  createQuestPersonalization,
  isValidQuestPersonalization,
  removeQuestParticipant,
  updateQuestParticipant,
} from "@/lib/shop/questPersonalization";
import {
  SOUND_CASE_001_ASSET_MANIFEST,
  type SoundCase001AssetId,
  type SoundCase001AudioAssetId,
  type SoundCase001SoundCardAssetId,
  type SoundCase001Stage3DistractorAssetId,
  type SoundCase001Stage6AudioAssetId,
  type SoundCase001VisualAssetId,
} from "@/lib/shop/quests/sound-case-001/assets";
import {
  SOUND_CASE_001_SOUND_CARDS,
  SOUND_CARD_BACK_SHEET_1,
  SOUND_CARD_BACK_SHEET_2,
  SOUND_CARD_DUPLEX_MODE,
  getLongEdgeBackSlot,
  getSoundCardsByIds,
  type SoundCardAccent,
  type SoundCardDefinition,
  type SoundCardModifier,
  type SoundCardTitleSize,
} from "@/lib/shop/quests/sound-case-001/soundCards";
import {
  SOUND_CASE_001_UNKNOWN_SOUND_CARD,
  UNKNOWN_SOUND_QR_ASSET_PATH,
  UNKNOWN_SOUND_QR_DESTINATION,
} from "@/lib/shop/quests/sound-case-001/unknownSoundCard";
import {
  SOUND_CASE_001_CARD_BOX,
  SOUND_CASE_001_CARD_BOX_DIELINE_ID,
} from "@/lib/shop/quests/sound-case-001/cardBox";
import { SOUND_CASE_001_INTRO_CARD } from "@/lib/shop/quests/sound-case-001/introCard";

describe("Sound Case personalization", () => {
  it("requires a non-empty lead name", () => {
    const draft = createQuestPersonalization("en");

    expect(isValidQuestPersonalization(draft)).toBe(false);
    expect(isValidQuestPersonalization({ ...draft, leadName: "  Maya  " })).toBe(true);
  });

  it("never adds more than eight participants", () => {
    let draft = createQuestPersonalization("ru");

    for (let index = 0; index < MAX_QUEST_PARTICIPANTS + 2; index += 1) {
      draft = addQuestParticipant(draft, `Participant ${index + 1}`);
    }

    expect(draft.participants).toHaveLength(MAX_QUEST_PARTICIPANTS);
    expect(draft.participants.at(-1)).toBe("Participant 8");
  });

  it("uses the same canonical contract for seeded, edited, and removed names", () => {
    let personalization = createQuestPersonalization("he", {
      leadName: "Maya",
      participants: ["Noa", "Sam"],
    });

    personalization = updateQuestParticipant(personalization, 0, "Leon");
    expect(personalization).toEqual({
      locale: "he",
      leadName: "Maya",
      participants: ["Leon", "Sam"],
    });

    personalization = removeQuestParticipant(personalization, 1);
    expect(personalization.participants).toEqual(["Leon"]);
  });
});

describe("Sound Case catalog safety", () => {
  it("resolves the prototype publicly but never as purchasable", () => {
    const product = getProductBySlug("sound-case-001");

    expect(product?.status).toBe("coming-soon");
    expect(getPublicProducts()).toContainEqual(product);
    expect(getPurchasableProducts()).not.toContainEqual(product);
  });
});

describe("Sound Case document configuration", () => {
  it("registers every printable page type in the exhaustive renderer", () => {
    expectTypeOf<QuestPageType>().toEqualTypeOf<
      | "sound-cards"
      | "sound-card-backs"
      | "stage-1-card-box"
      | "stage-2-vibrating-cards"
      | "stage-2-clue-back"
      | "stage-2-box"
      | "stage-4-cards"
      | "stage-4-box-rules"
      | "stage-5-cards"
      | "stage-5-box"
    >();

    const definition = SOUND_CASE_001_PAGES[0];
    const html = renderToStaticMarkup(
      renderQuestPageDefinition(definition, {
        personalization: {
          locale: "en",
          leadName: "Maya",
          participants: [],
        },
        assetManifest: SOUND_CASE_001_ASSET_MANIFEST,
      }),
    );

    expect(html).toContain('class="quest-sound-cards-sheet');
    expect(html).not.toContain("quest-product-preview");

    const rendererSource = readFileSync(
      `${process.cwd()}/components/shop/questPageRenderers.tsx`,
      "utf8",
    );
    expect(rendererSource).not.toContain('"case-cover":');
    expect(rendererSource).toContain('"sound-cards":');
    expect(rendererSource).toContain('"sound-card-backs":');
    expect(rendererSource).toContain('"stage-1-card-box":');
  });

  it("exposes two paired card sheets followed by the single-sided box", () => {
    expect(
      getPrintableQuestPages(SOUND_CASE_001_PAGES).map(
        ({ id, type, printOrder }) => ({ id, type, printOrder }),
      ),
    ).toEqual([
      {
        id: "sound-case-001-sound-cards-1",
        type: "sound-cards",
        printOrder: 1,
      },
      {
        id: "sound-case-001-sound-card-backs-1",
        type: "sound-card-backs",
        printOrder: 2,
      },
      {
        id: "sound-case-001-sound-cards-2",
        type: "sound-cards",
        printOrder: 3,
      },
      {
        id: "sound-case-001-sound-card-backs-2",
        type: "sound-card-backs",
        printOrder: 4,
      },
      {
        id: "sound-case-001-stage-1-card-box",
        type: "stage-1-card-box",
        printOrder: 5,
      },
    ]);
  });

  it("adds a 1:1 single-sided Stage 01 tuck-box dieline after both duplex pairs", () => {
    const questPages: readonly QuestPageDefinition[] = SOUND_CASE_001_PAGES;
    const boxPages = questPages.filter(
      (page): page is Stage1CardBoxPageDefinition =>
        page.type === "stage-1-card-box",
    );
    const box = boxPages[0];
    const svg = readFileSync(
      `${process.cwd()}/public${SOUND_CASE_001_CARD_BOX.svgPath}`,
      "utf8",
    );

    expect(boxPages).toHaveLength(1);
    expect(box).toMatchObject({
      printOrder: 5,
      printable: true,
      side: "single",
      dielineId: SOUND_CASE_001_CARD_BOX_DIELINE_ID,
    });
    expect(SOUND_CASE_001_CARD_BOX.cardCount).toBe(14);
    expect(SOUND_CASE_001_CARD_BOX.internalSizeMm).toEqual({
      width: 62,
      height: 82,
      depth: 9,
    });
    expect(SOUND_CASE_001_CARD_BOX.cardstockModel).toEqual({
      recommendedGsm: [200, 300],
      conservativeCaliperMm: 0.4,
      estimatedStackDepthMm: 5.6,
      depthClearanceMm: 3.4,
    });
    expect(SOUND_CASE_001_CARD_BOX.dielineSizeMm).toEqual({
      width: 152,
      height: 142,
    });
    expect(
      SOUND_CASE_001_CARD_BOX.glueFlapWidthMm +
        SOUND_CASE_001_CARD_BOX.internalSizeMm.depth * 2 +
        SOUND_CASE_001_CARD_BOX.internalSizeMm.width * 2,
    ).toBe(SOUND_CASE_001_CARD_BOX.dielineSizeMm.width);
    expect(
      SOUND_CASE_001_CARD_BOX.topFlapExtentMm +
        SOUND_CASE_001_CARD_BOX.internalSizeMm.height +
        SOUND_CASE_001_CARD_BOX.bottomFlapExtentMm,
    ).toBe(SOUND_CASE_001_CARD_BOX.dielineSizeMm.height);
    expect(SOUND_CASE_001_CARD_BOX.dielineSizeMm.width).toBeLessThanOrEqual(210);
    expect(SOUND_CASE_001_CARD_BOX.dielineSizeMm.height).toBeLessThanOrEqual(297);
    expect(svg).toContain('width="152mm"');
    expect(svg).toContain('height="142mm"');
    expect(svg).toContain('viewBox="0 0 152 142"');
    for (const groupId of [
      "artwork",
      "front-panel",
      "back-panel",
      "left-panel",
      "right-panel",
      "top-panel",
      "bottom-panel",
      "fold-guides",
      "cut-guides",
    ]) {
      expect(svg).toContain(`id="${groupId}"`);
    }
    expect(svg).toContain('stroke-dasharray="2 1.5"');
  });

  it("filters non-printable definitions and sorts printable pages stably", () => {
    const pages = [
      {
        id: "later",
        type: "stage-1-card-box",
        printOrder: 2,
        printable: true,
        side: "single",
        dielineId: SOUND_CASE_001_CARD_BOX_DIELINE_ID,
      },
      {
        id: "helper-only",
        type: "stage-1-card-box",
        printOrder: 0,
        printable: false,
        side: "single",
        dielineId: SOUND_CASE_001_CARD_BOX_DIELINE_ID,
      },
      {
        id: "first-at-one",
        type: "stage-1-card-box",
        printOrder: 1,
        printable: true,
        side: "single",
        dielineId: SOUND_CASE_001_CARD_BOX_DIELINE_ID,
      },
      {
        id: "second-at-one",
        type: "stage-1-card-box",
        printOrder: 1,
        printable: true,
        side: "single",
        dielineId: SOUND_CASE_001_CARD_BOX_DIELINE_ID,
      },
    ] satisfies readonly QuestPageDefinition[];

    expect(getPrintableQuestPages(pages).map((page) => page.id)).toEqual([
      "first-at-one",
      "second-at-one",
      "later",
    ]);

    const html = renderToStaticMarkup(
      createElement(QuestDocument, {
        pages,
        personalization: {
          locale: "en",
          leadName: "Maya",
          participants: [],
        },
      }),
    );

    expect(html).not.toContain('data-page-id="helper-only"');
    expect(html.indexOf('data-page-id="first-at-one"')).toBeLessThan(
      html.indexOf('data-page-id="second-at-one"'),
    );
    expect(html.indexOf('data-page-id="second-at-one"')).toBeLessThan(
      html.indexOf('data-page-id="later"'),
    );
  });

  it("delegates rendering through the registry without page-type conditionals", () => {
    const source = readFileSync(
      `${process.cwd()}/components/shop/QuestDocument.tsx`,
      "utf8",
    );

    expect(source).toContain("renderQuestPageDefinition(page, renderContext)");
    expect(source).not.toMatch(/if\s*\(\s*page\.type/);
    expect(source).not.toMatch(/switch\s*\(\s*page\.type/);
  });

  it("keeps the product preview outside the printable document", () => {
    const personalization = {
      locale: "en" as const,
      leadName: "Maya",
      participants: ["Noa", "Sam"],
    };
    const previewHtml = renderToStaticMarkup(
      createElement(QuestPreview, { personalization }),
    );
    const documentHtml = renderToStaticMarkup(
      createElement(QuestDocument, { personalization }),
    );

    expect(previewHtml).toContain('data-quest-preview="sound-case-001"');
    expect(previewHtml).not.toContain("data-quest-document");
    expect(documentHtml).toContain('data-quest-document="sound-case-001"');
    expect(documentHtml).not.toContain('data-page-type="case-cover"');
    expect(documentHtml).toContain('data-page-type="stage-1-card-box"');
    expect(documentHtml).not.toContain("data-quest-preview");
  });

  it("renders the same personalized names in preview and box dossier", () => {
    const personalization = {
      locale: "ru" as const,
      leadName: "Майя",
      participants: ["Ноя", "Саша"],
    };
    const previewHtml = renderToStaticMarkup(
      createElement(QuestPreview, { personalization }),
    );
    const documentHtml = renderToStaticMarkup(
      createElement(QuestDocument, { personalization }),
    );

    for (const name of [personalization.leadName, ...personalization.participants]) {
      expect(previewHtml).toContain(name);
      expect(documentHtml).toContain(name);
    }
  });

  it("keeps the case cover free from early mystery spoilers", () => {
    const bannedTerms = [
      /dune|sand|singing|resonance|vibration|caltech|coordinate/i,
      /дюн|пес|резонанс|вибрац|координат|калтех/i,
      /דיונ|חול|תהוד|רעיד|קואורדינט|קלטק/i,
    ];

    for (const lang of ["ru", "en", "he"] as const) {
      const cover = dictionaries[lang].shop.soundCase.caseCover;
      const coverCopy = JSON.stringify(cover);
      for (const bannedTerm of bannedTerms) {
        expect(coverCopy).not.toMatch(bannedTerm);
      }
    }
  });
});

describe("Sound Case asset manifest", () => {
  it("owns a finite typed set of semantic visual and audio assets", () => {
    expectTypeOf<SoundCase001VisualAssetId>().toEqualTypeOf<
      Exclude<
        SoundCase001AssetId,
        "stage-1-unknown-recording" | SoundCase001Stage3DistractorAssetId | SoundCase001Stage6AudioAssetId
      >
    >();
    expectTypeOf<SoundCase001AudioAssetId>().toEqualTypeOf<
      "stage-1-unknown-recording" | SoundCase001Stage3DistractorAssetId | SoundCase001Stage6AudioAssetId
    >();
    expectTypeOf<SoundCardDefinition["illustrationAssetId"]>().toEqualTypeOf<
      SoundCase001SoundCardAssetId
    >();

    expect(SOUND_CASE_001_ASSET_MANIFEST.questId).toBe("sound-case-001");
    expect(Object.keys(SOUND_CASE_001_ASSET_MANIFEST.assets)).toHaveLength(86);
    expect(SOUND_CASE_001_ASSET_MANIFEST.assets).not.toHaveProperty(
      "stage-1-sound-card-illustration",
    );
    expect(
      SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-unknown-recording"].kind,
    ).toBe("audio");
    expect(
      SOUND_CASE_001_ASSET_MANIFEST.assets["unknown-sound-digital-parrot"].kind,
    ).toBe("visual");
    expect(
      SOUND_CASE_001_ASSET_MANIFEST.assets["unknown-sound-studio-background"].kind,
    ).toBe("visual");
  });

  it("contains media ownership only, without copy, pages, layout, or renderers", () => {
    expect(SOUND_CASE_001_ASSET_MANIFEST).not.toHaveProperty("pages");
    expect(SOUND_CASE_001_ASSET_MANIFEST).not.toHaveProperty("layout");
    expect(SOUND_CASE_001_ASSET_MANIFEST).not.toHaveProperty("component");

    for (const asset of Object.values(SOUND_CASE_001_ASSET_MANIFEST.assets)) {
      expect(Object.keys(asset).sort()).toEqual(["id", "kind", "source"]);
      expect(asset).not.toHaveProperty("locale");
      expect(asset).not.toHaveProperty("title");
      expect(asset).not.toHaveProperty("text");
      expect(["unconfigured", "external"]).toContain(asset.source.status);
    }
  });

  it("represents optional and required unconfigured assets explicitly", () => {
    const decoration =
      SOUND_CASE_001_ASSET_MANIFEST.assets["case-cover-decoration"];

    expect(getOptionalQuestAssetUrl(decoration)).toBeUndefined();
    expect(() => requireQuestAssetUrl(decoration)).toThrow(
      "Required quest asset is not configured: case-cover-decoration",
    );
  });

  it("uses the existing typed printable parrot asset on the investigation start", () => {
    const html = renderToStaticMarkup(
      createElement(QuestDocument, {
        personalization: {
          locale: "en",
          leadName: "Maya",
          participants: [],
        },
      }),
    );

    expect(html).toContain('src="https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/sound-cards/assets/stage-1-unknown-sound-parrot.webp"');
    expect(html).not.toContain("quest-case-cover__asset-slot");
  });

  it("does not expose arbitrary string lookup or couple preview to print assets", () => {
    const assetSource = readFileSync(
      `${process.cwd()}/lib/shop/questAssets.ts`,
      "utf8",
    );
    const previewSource = readFileSync(
      `${process.cwd()}/components/shop/QuestPreview.tsx`,
      "utf8",
    );

    expect(assetSource).not.toContain("Record<string");
    expect(assetSource).not.toMatch(/get\w*Asset\w*\(\s*(id|key):\s*string/);
    expect(previewSource).not.toContain("questAssets");
    expect(previewSource).not.toContain("ASSET_MANIFEST");
  });
});

describe("Sound Case Stage 01 Sound Cards", () => {
  const questPages: readonly QuestPageDefinition[] = SOUND_CASE_001_PAGES;
  const soundCardSheets = questPages.filter(
    (page): page is SoundCardsPageDefinition => page.type === "sound-cards",
  );
  const soundCardBackSheets = questPages.filter(
    (page): page is SoundCardBacksPageDefinition =>
      page.type === "sound-card-backs",
  );

  it("defines one nine-card sheet and one three-card sheet", () => {
    expect(soundCardSheets).toHaveLength(2);
    expect(soundCardSheets[0]?.cardIds).toEqual([
      "sound-card-01",
      "sound-card-02",
      "sound-card-03",
      "sound-card-04",
      "sound-card-05",
      "sound-card-06",
      "sound-card-07",
      "sound-card-08",
      "sound-card-09",
    ]);
    expect(soundCardSheets[1]?.cardIds).toEqual([
      "sound-card-10",
      "sound-card-11",
      "sound-card-12",
    ]);
    expect(soundCardSheets.map(({ sheetNumber }) => sheetNumber)).toEqual([1, 2]);
  });

  it("owns twelve unique cards in numeric order", () => {
    const firstSheet = soundCardSheets[0];
    if (!firstSheet) {
      throw new Error("Sound Cards sheet 1 is missing");
    }

    const ids = SOUND_CASE_001_SOUND_CARDS.map(({ id }) => id);
    const numbers = SOUND_CASE_001_SOUND_CARDS.map(({ number }) => number);

    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(getSoundCardsByIds(firstSheet.cardIds).map(({ id }) => id)).toEqual(
      firstSheet.cardIds,
    );

    const configuredCardIds = soundCardSheets.flatMap(({ cardIds }) => cardIds);
    expect(configuredCardIds).toEqual(ids);
    expect(new Set(configuredCardIds).size).toBe(12);
  });

  it("resolves every illustration ID to a configured visual asset", () => {
    const illustrationAssetIds = SOUND_CASE_001_SOUND_CARDS.map(
      ({ illustrationAssetId }) => illustrationAssetId,
    );

    expect(new Set(illustrationAssetIds).size).toBe(12);

    for (const card of SOUND_CASE_001_SOUND_CARDS) {
      const asset = SOUND_CASE_001_ASSET_MANIFEST.assets[card.illustrationAssetId];

      expect(asset.kind).toBe("visual");
      expect(asset.source.status).toBe("external");
      expect(requireQuestAssetUrl(asset)).toMatch(
        /^https:\/\/media\.laplapla\.com\/quests\/sound-case-001\/stage-01-sound-crocodile\/sound-cards\//,
      );
    }
  });

  it("has localized copy for every card and every modifier", () => {
    for (const lang of ["ru", "en", "he"] as const) {
      const copy = dictionaries[lang].shop.soundCase.soundCards;

      for (const card of SOUND_CASE_001_SOUND_CARDS) {
        expect(copy.titles[card.titleKey]).toBeTruthy();
        if (card.modifier) {
          expect(copy.modifiers[card.modifier]).toBeTruthy();
        }
      }
      expect(copy.footerInstruction).toBeTruthy();
    }
  });

  it("gives every card a finite card-owned accent identity", () => {
    expectTypeOf<SoundCardAccent>().toEqualTypeOf<
      | "cyan"
      | "green"
      | "orange"
      | "coral"
      | "blue"
      | "yellow"
      | "amber"
      | "violet"
      | "red"
      | "teal"
      | "indigo"
      | "magenta"
    >();

    const accents = SOUND_CASE_001_SOUND_CARDS.map(({ accent }) => accent);
    expect(accents).toHaveLength(12);
    expect(new Set(accents).size).toBe(12);
  });

  it("uses finite semantic title sizes without runtime measurement", () => {
    expectTypeOf<SoundCardTitleSize>().toEqualTypeOf<
      "normal" | "long" | "extra-long"
    >();
    expect(
      SOUND_CASE_001_SOUND_CARDS.filter(
        ({ titleSize }) => titleSize === "extra-long",
      ).map(({ id }) => id),
    ).toEqual(["sound-card-02", "sound-card-05", "sound-card-08"]);
  });

  it("uses the finite modifier model on exactly three cards", () => {
    expectTypeOf<SoundCardModifier>().toEqualTypeOf<
      "reverse" | "nose-pinched" | "hand-megaphone"
    >();
    expect(
      SOUND_CASE_001_SOUND_CARDS.filter(({ modifier }) => modifier).map(
        ({ id }) => id,
      ),
    ).toEqual(["sound-card-02", "sound-card-07", "sound-card-09"]);
  });

  it("uses one configured ordinary back asset for all twelve cards", () => {
    const backAsset =
      SOUND_CASE_001_ASSET_MANIFEST.assets["stage-1-card-back"];
    const placements = soundCardBackSheets.flatMap(({ cards }) => cards);

    expect(soundCardBackSheets).toHaveLength(2);
    expect(soundCardBackSheets.every(({ backAssetId }) => backAssetId === "stage-1-card-back")).toBe(true);
    expect(backAsset.kind).toBe("visual");
    expect(requireQuestAssetUrl(backAsset)).toBe(
      "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/sound-cards/backs/stage-1-sound-card-back.webp",
    );
    expect(placements).toHaveLength(12);
    expect(new Set(placements.map(({ cardId }) => cardId)).size).toBe(12);

    const parrotAsset =
      SOUND_CASE_001_ASSET_MANIFEST.assets["sound-lab-parrot"];
    expect(requireQuestAssetUrl(parrotAsset)).toBe(
      "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/sound-cards/assets/stage-1-unknown-sound-parrot.webp",
    );
  });

  it("models deterministic long-edge duplex slot mapping without fake cards", () => {
    const slots = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

    expect(SOUND_CARD_DUPLEX_MODE).toBe("flip-long-edge");
    expect(slots.map(getLongEdgeBackSlot)).toEqual([
      3, 2, 1, 6, 5, 4, 9, 8, 7,
    ]);
    expect(SOUND_CARD_BACK_SHEET_1).toHaveLength(9);
    expect(SOUND_CARD_BACK_SHEET_2).toHaveLength(3);
    expect(SOUND_CARD_BACK_SHEET_2.map(({ backSlot }) => backSlot)).toEqual([
      3, 2, 1,
    ]);
    expect(SOUND_CARD_BACK_SHEET_2.every(({ frontSlot, backSlot }) =>
      getLongEdgeBackSlot(frontSlot) === backSlot,
    )).toBe(true);
  });

  it("keeps UNKNOWN SOUND separate from the numbered Sound Card domain", () => {
    expect(SOUND_CASE_001_UNKNOWN_SOUND_CARD).toEqual({
      id: "unknown-sound-card",
      frontRole: "unknown-sound-front",
      backRole: "unknown-sound-back",
      frontSlot: 4,
      backSlot: 6,
      duplexMode: "flip-long-edge",
      parrotAssetId: "sound-lab-parrot",
      qrDestination:
        "https://www.laplapla.com/quests/sound-case-001/stage-01/unknown-sound",
      qrAssetPath:
        "/quests/sound-case-001/stage-01/unknown-sound-qr.svg",
    });
    expect(JSON.stringify(SOUND_CASE_001_SOUND_CARDS)).not.toContain(
      "sound-card-13",
    );

    const secondFront = soundCardSheets.find(({ sheetNumber }) => sheetNumber === 2);
    const secondBack = soundCardBackSheets.find(({ sheetNumber }) => sheetNumber === 2);
    expect(secondFront?.unknownSoundCard).toBe(SOUND_CASE_001_UNKNOWN_SOUND_CARD);
    expect(secondBack?.unknownSoundCard).toBe(SOUND_CASE_001_UNKNOWN_SOUND_CARD);
  });

  it("places the semantic INTRO CARD in the self-mirroring slot 5", () => {
    expect(SOUND_CASE_001_INTRO_CARD).toEqual({
      id: "stage-1-intro-card",
      frontRole: "stage-1-intro-front",
      backRole: "stage-1-intro-back",
      frontSlot: 5,
      backSlot: 5,
      duplexMode: "flip-long-edge",
      parrotAssetId: "sound-lab-parrot",
    });
    expect(SOUND_CASE_001_INTRO_CARD.backSlot).toBe(
      getLongEdgeBackSlot(SOUND_CASE_001_INTRO_CARD.frontSlot),
    );
    expect(SOUND_CASE_001_INTRO_CARD.id).not.toBe("sound-card-13");

    const secondFront = soundCardSheets.find(({ sheetNumber }) => sheetNumber === 2);
    const secondBack = soundCardBackSheets.find(({ sheetNumber }) => sheetNumber === 2);
    expect(secondFront && "introCard" in secondFront ? secondFront.introCard : undefined)
      .toBe(SOUND_CASE_001_INTRO_CARD);
    expect(secondBack && "introCard" in secondBack ? secondBack.introCard : undefined)
      .toBe(SOUND_CASE_001_INTRO_CARD);

    const html = renderToStaticMarkup(
      createElement(QuestDocument, {
        personalization: { locale: "ru", leadName: "Майя", participants: ["Ноя"] },
      }),
    );
    expect(html).toContain('data-rendering-role="stage-1-intro-front"');
    expect(html).toContain('data-rendering-role="stage-1-intro-back"');
    expect(html).toContain('data-front-slot="5"');
    expect(html).toContain('data-back-slot="5"');
    expect(html.match(/quest-sound-card-cut-area/g)).toHaveLength(28);
  });

  it("renders one production QR with identical destination in RU, EN, and HE", () => {
    expect(UNKNOWN_SOUND_QR_DESTINATION).toBe(
      "https://www.laplapla.com/quests/sound-case-001/stage-01/unknown-sound",
    );

    const destination = new URL(UNKNOWN_SOUND_QR_DESTINATION);
    expect(destination.protocol).toBe("https:");
    expect(destination.hostname).toBe("www.laplapla.com");
    expect(destination.pathname).toBe(
      "/quests/sound-case-001/stage-01/unknown-sound",
    );
    expect(destination.search).toBe("");
    expect(destination.hash).toBe("");
    expect(destination.pathname).not.toMatch(/^\/(ru|en|he)\//);
    expect(UNKNOWN_SOUND_QR_DESTINATION).not.toMatch(
      /localhost|vercel|r2\.dev|cloudflare|\.mp3/i,
    );

    for (const locale of ["ru", "en", "he"] as const) {
      const copy = dictionaries[locale].shop.soundCase.unknownSoundCard;
      expect(copy.title).toBeTruthy();
      expect(copy.qrAccessLabel).toBeTruthy();
      expect(copy.listenAction).toBeTruthy();
      expect(copy.question).toBeTruthy();
      expect(copy.evidenceLines).toHaveLength(3);
      expect(copy.actionLines).toHaveLength(3);

      const html = renderToStaticMarkup(
        createElement(QuestDocument, {
          personalization: { locale, leadName: "Maya", participants: [] },
        }),
      );
      expect(html).toContain('data-rendering-role="unknown-sound-front"');
      expect(html).toContain('data-rendering-role="unknown-sound-back"');
      expect(html).toContain('data-qr-reserved="true"');
      expect(html).toContain(
        `data-qr-destination="${UNKNOWN_SOUND_QR_DESTINATION}"`,
      );
      expect(html).toContain(`src="${UNKNOWN_SOUND_QR_ASSET_PATH}"`);
      expect(html).toContain(`alt="${copy.qrAccessLabel}"`);
      expect(html.match(/class="quest-unknown-sound-card__qr"/g)).toHaveLength(1);
      expect(html).toContain('<bdi dir="ltr">001</bdi>');
      expect(html).not.toContain("<canvas");
      expect(html).not.toContain("sound-card-13");
      expect(html).not.toContain("QR RESERVED AREA");
    }
  });

  it("keeps the approved UNKNOWN evidence and action copy with enlarged roles", () => {
    expect(dictionaries.ru.shop.soundCase.unknownSoundCard.evidenceLines).toEqual([
      "Настоящий звук.",
      "Настоящее место.",
      "Настоящая загадка.",
    ]);
    expect(dictionaries.ru.shop.soundCase.unknownSoundCard.actionLines).toEqual([
      "Слушай.",
      "Думай.",
      "Исследуй.",
    ]);

    const html = renderToStaticMarkup(
      createElement(QuestDocument, {
        personalization: { locale: "ru", leadName: "Майя", participants: [] },
      }),
    );
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");

    expect(html).toContain('class="quest-unknown-sound-card__evidence"');
    expect(html).toContain('class="quest-unknown-sound-card__action"');
    expect(css).toMatch(
      /\.quest-unknown-sound-card__lower p\s*\{[\s\S]*?font-size: 1\.85mm;/,
    );
    expect(css).toMatch(
      /\.quest-unknown-sound-card__lower \.quest-unknown-sound-card__action\s*\{[\s\S]*?font-size: 2\.15mm;/,
    );
  });

  it("prints localized orientation marks on fronts and pairing labels on backs", () => {
    for (const locale of ["ru", "en", "he"] as const) {
      const guidance = dictionaries[locale].shop.soundCase.soundCardBacks;
      const html = renderToStaticMarkup(
        createElement(QuestDocument, {
          personalization: { locale, leadName: "Maya", participants: [] },
        }),
      );

      expect(guidance.frontTopEdge).toBeTruthy();
      expect(guidance.frontSideLabel).toBeTruthy();
      expect(guidance.notNewSheet).toBeTruthy();
      expect(html.match(/data-page-orientation-guide="front-top-edge"/g)).toHaveLength(2);
      expect(html.match(/data-duplex-pairing-guide="true"/g)).toHaveLength(2);
      expect(html).toContain(guidance.frontTopEdge);

      const front1Start = html.indexOf(
        'data-page-id="sound-case-001-sound-cards-1"',
      );
      const back1Start = html.indexOf(
        'data-page-id="sound-case-001-sound-card-backs-1"',
      );
      const front1 = html.slice(front1Start, back1Start);
      expect(front1).toContain('data-page-orientation-guide="front-top-edge"');
      expect(front1).toContain(`${guidance.sheetLabel} <bdi dir="ltr">1</bdi>`);
      expect(
        front1.indexOf('data-page-orientation-guide="front-top-edge"'),
      ).toBeLessThan(front1.indexOf('class="quest-sound-cards-sheet__grid"'));

      const front2Start = html.indexOf(
        'data-page-id="sound-case-001-sound-cards-2"',
      );
      const back1 = html.slice(back1Start, front2Start);
      expect(back1).not.toContain("data-page-orientation-guide");
      expect(back1).toContain("SOUND CARDS 1/2");
      expect(back1).toContain("SOUND CARD BACKS 1/2");
      expect(back1.indexOf('class="quest-sound-cards-sheet__grid"')).toBeLessThan(
        back1.indexOf('data-duplex-pairing-guide="true"'),
      );

      const back2Start = html.indexOf(
        'data-page-id="sound-case-001-sound-card-backs-2"',
      );
      const front2 = html.slice(front2Start, back2Start);
      expect(front2).toContain('data-page-orientation-guide="front-top-edge"');
      expect(front2).toContain(`${guidance.sheetLabel} <bdi dir="ltr">2</bdi>`);
      expect(
        front2.indexOf('data-page-orientation-guide="front-top-edge"'),
      ).toBeLessThan(front2.indexOf('class="quest-sound-cards-sheet__grid"'));

      const back2 = html.slice(back2Start);
      expect(back2).not.toContain("data-page-orientation-guide");
      expect(back2).toContain("SOUND CARDS 2/2");
      expect(back2).toContain("SOUND CARD BACKS 2/2");
      expect(back2.indexOf('class="quest-sound-cards-sheet__grid"')).toBeLessThan(
        back2.indexOf('data-duplex-pairing-guide="true"'),
      );
    }
  });

  it("keeps a sharp black-and-white SVG QR inside the existing 25mm area", () => {
    const svg = readFileSync(
      `${process.cwd()}/public${UNKNOWN_SOUND_QR_ASSET_PATH}`,
      "utf8",
    );
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");

    expect(svg).toContain('viewBox="0 0 49 49"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).not.toContain("transform=");
    expect(css).toMatch(
      /\.quest-unknown-sound-card__qr-reserved\s*\{[\s\S]*?width: 25mm;[\s\S]*?height: 25mm;/,
    );
    expect(css).toMatch(
      /\.quest-unknown-sound-card__qr\s*\{[\s\S]*?transform: none;[\s\S]*?filter: none;/,
    );
  });

  it("renders both sheets inside QuestDocument and outside QuestPreview", () => {
    const personalization = {
      locale: "en" as const,
      leadName: "Maya",
      participants: [],
    };
    const documentHtml = renderToStaticMarkup(
      createElement(QuestDocument, { personalization }),
    );
    const previewHtml = renderToStaticMarkup(
      createElement(QuestPreview, { personalization }),
    );

    expect(documentHtml.match(/data-page-type="sound-cards"/g)).toHaveLength(2);
    expect(documentHtml.match(/data-card-accent=/g)).toHaveLength(12);
    expect(documentHtml.match(/data-rendering-role="ordinary-sound-card-back"/g)).toHaveLength(12);
    expect(documentHtml).toContain("SOUND CARDS 1/2");
    expect(documentHtml).toContain("SOUND CARDS 2/2");
    expect(previewHtml).not.toContain("quest-sound-cards-sheet");
    expect(previewHtml).not.toContain("data-sound-card-id");

    const secondFrontStart = documentHtml.indexOf(
      'data-page-id="sound-case-001-sound-cards-2"',
    );
    const secondBackStart = documentHtml.indexOf(
      'data-page-id="sound-case-001-sound-card-backs-2"',
    );
    const secondFrontHtml = documentHtml.slice(
      secondFrontStart,
      secondBackStart,
    );
    const secondBackHtml = documentHtml.slice(secondBackStart);
    expect(secondFrontHtml.match(/quest-sound-card-cut-area/g)).toHaveLength(5);
    expect(secondBackHtml.match(/quest-sound-card-cut-area/g)).toHaveLength(5);
  });
});

describe("Sound Case localization and print boundaries", () => {
  it.each(["ru", "en", "he"] as const)("has complete %s preview and cover copy", (lang) => {
    const soundCase = dictionaries[lang].shop.soundCase;

    expect(soundCase.title).toBeTruthy();
    expect(soundCase.preview.includedItems).toHaveLength(7);
    expect(soundCase.preview.howItWorksSteps).toHaveLength(4);
    expect(soundCase.preview.requirements).toHaveLength(5);
    expect(soundCase.preview.adventureStages).toHaveLength(8);
    expect(soundCase.preview.buyAction).toBeTruthy();
    expect(soundCase.caseCover.dossierStatuses).toHaveLength(3);
    expect(soundCase.caseCover.parrotLines.length).toBeGreaterThan(0);
    expect(soundCase.caseCover.gameRules).toHaveLength(4);
    expect(Object.keys(soundCase.soundCards.titles)).toHaveLength(12);
  });

  it.each(["ru", "en", "he"] as const)(
    "redistributes the localized %s investigation start between INTRO CARD and box",
    (locale) => {
      const personalization = {
        locale,
        leadName: "Maya מאיה",
        participants: ["Noa נועה", "Sam"],
      };
      const copy = dictionaries[locale].shop.soundCase.caseCover;
      const html = renderToStaticMarkup(
        createElement(QuestDocument, { personalization }),
      );
      expect(SOUND_CASE_001_PAGES[0]).toMatchObject({
        id: "sound-case-001-sound-cards-1",
        type: "sound-cards",
        printOrder: 1,
        printable: true,
      });
      expect(html).not.toContain('data-page-type="case-cover"');
      expect(html).toContain('data-rendering-role="stage-1-intro-front"');
      expect(html).toContain('data-rendering-role="stage-1-intro-back"');
      expect(html).toContain('id="box-artwork-front-panel"');
      expect(html).toContain('id="box-artwork-back-panel"');
      expect(html).toContain(dictionaries[locale].shop.soundCase.cardBox.stageNumber);
      expect(html).toContain("Maya מאיה</bdi>");
      expect(html).toContain("<bdi>Noa נועה</bdi>");
      expect(html).toContain("<bdi>Sam</bdi>");
      expect(html).toContain(copy.parrotLabel);
      expect(html).toContain(copy.parrotCallout);
      expect(html).toContain(copy.gameHeading);
      expect(html).toContain(copy.gameFlow);
      for (const rule of copy.gameRules) expect(html).toContain(rule);
      expect(html).not.toContain("{ИМЯ}");
      expect(html).not.toMatch(
        /booming dunes|singing dunes|sand|desert|kelso|дюн|песок|пустын|חול|מדבר/i,
      );
    },
  );

  it("keeps the approved Russian Stage 01 intro and core rules", () => {
    const copy = dictionaries.ru.shop.soundCase.caseCover;

    expect(copy.parrotGreeting).toBe(", наконец-то!");
    expect(copy.parrotLines).toEqual([
      "У меня проблема.",
      "Сегодня в студию прислали одну совершенно невозможную запись.",
      "Я знаю, как звучит контрабас. Я знаю, как звучит кит. Я даже знаю, как звучит холодильник в три часа ночи.",
      "Но ЭТО я определить не могу.",
      "Поэтому мне нужны дополнительные уши. Твои и всех, кого ты сумеешь уговорить участвовать.",
      "Но сначала надо убедиться, что вы вообще умеете отличать один звук от другого.",
    ]);
    expect(copy.parrotCallout).toBe("Устраиваем звуковой крокодил!");
    expect(copy.gameRules).toEqual([
      "Можно издавать любые звуки ртом.",
      "Нельзя говорить слова.",
      "Нельзя показывать жестами.",
      "Не показывай карточку остальным.",
    ]);
  });

  it("removes the text-only A4 page and keeps a five-page useful document", () => {
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");
    const html = renderToStaticMarkup(
      createElement(QuestDocument, {
        personalization: {
          locale: "ru",
          leadName: "Майя",
          participants: Array.from({ length: 8 }, (_, index) => `Участник ${index + 1}`),
        },
      }),
    );
    expect(html.match(/data-page-id=/g)).toHaveLength(5);
    expect(html).not.toContain('data-page-id="sound-case-001-case-cover"');
    expect(html).not.toContain('class="quest-case-cover"');
    expect(html).toContain('data-page-id="sound-case-001-stage-1-card-box"');
    expect(html).toContain('data-side="single"');
    expect(html).toContain("ЭТАП 01");
    expect(html).toContain("ЗВУКОВОЙ КРОКОДИЛ");
    expect(css).toContain("aspect-ratio: 210 / 297");
    expect(css).toMatch(/\.quest-intro-card\s*\{[\s\S]*?width: 60mm;[\s\S]*?height: 80mm;/);
    expect(css).toMatch(
      /\.quest-intro-card__speech p\s*\{[\s\S]*?font-size: 2\.7mm;/,
    );
  });

  it("renders Hebrew RTL and keeps user names in bidi isolation elements", () => {
    const personalization = {
      locale: "he" as Lang,
      leadName: "Maya מאיה",
      participants: ["Noa נועה"],
    };
    const previewHtml = renderToStaticMarkup(
      createElement(QuestPreview, { personalization }),
    );
    const documentHtml = renderToStaticMarkup(
      createElement(QuestDocument, { personalization }),
    );

    expect(previewHtml).toContain('dir="rtl"');
    expect(documentHtml).toContain('dir="rtl"');
    expect(previewHtml).toContain("<bdi>Maya מאיה</bdi>");
    expect(previewHtml).toContain("<bdi>Noa נועה</bdi>");
    expect(documentHtml).toContain("Maya מאיה</bdi>");
    expect(documentHtml).toContain("<bdi>Noa נועה</bdi>");
    expect(documentHtml).toContain("SOUND CARD</bdi>");
    expect(documentHtml).toContain('dir="ltr">01</bdi>');
  });

  it("prints only the document host and hides builder, preview, and site UI", () => {
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");
    const printCss = css.slice(css.indexOf("@media print"));

    expect(printCss).toContain(".top-bar");
    expect(printCss).toContain(".quest-builder-controls");
    expect(printCss).toContain(".quest-product-preview");
    expect(printCss).toContain(".footer-stack");
    expect(printCss).toMatch(/\.quest-document-print-host[\s\S]*display: block !important/);
    expect(printCss).toContain("width: 210mm !important");
    expect(printCss).toContain("height: 297mm !important");
    expect(css).toContain("aspect-ratio: 210 / 297");
    expect(css).toContain("grid-template-columns: repeat(3, 64mm)");
    expect(css).toContain("grid-template-rows: repeat(3, 84mm)");
    expect(css).toContain("padding: 6mm 7mm");
    expect(css).toMatch(/\.quest-sound-cards-sheet__grid[\s\S]*direction: ltr/);
    expect(css).toContain("width: 60mm");
    expect(css).toContain("height: 80mm");
    expect(SOUND_CASE_001_PAGES).toHaveLength(5);
    expect(css).toMatch(
      /\.quest-card-box-sheet__guides\s*\{[\s\S]*?width: 152mm;[\s\S]*?height: 142mm;/,
    );
    expect(css).toMatch(/\.quest-sound-card__illustration img[\s\S]*object-fit: contain/);
  });
});
