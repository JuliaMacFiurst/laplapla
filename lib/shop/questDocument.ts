import type { LocalizedString } from "./types";
import type { Lang } from "@/i18n";
import type {
  SoundCardDuplexMode,
  SoundCardFullBackSelection,
  SoundCardFullSheetSelection,
  SoundCardPartialBackSelection,
  SoundCardPartialSheetSelection,
} from "./quests/sound-case-001/soundCards";
import type { UnknownSoundCardDefinition } from "./quests/sound-case-001/unknownSoundCard";
import type { IntroCardDefinition } from "./quests/sound-case-001/introCard";
import {
  SOUND_CARD_BACK_SHEET_1,
  SOUND_CARD_BACK_SHEET_2,
  SOUND_CARD_DUPLEX_MODE,
} from "./quests/sound-case-001/soundCards";
import { SOUND_CASE_001_UNKNOWN_SOUND_CARD } from "./quests/sound-case-001/unknownSoundCard";
import { SOUND_CASE_001_INTRO_CARD } from "./quests/sound-case-001/introCard";
import {
  SOUND_CASE_001_CARD_BOX_DIELINE_ID,
  type SoundCase001CardBoxDielineId,
} from "./quests/sound-case-001/cardBox";
import {
  SOUND_CASE_001_STAGE_2_BOX_DIELINE_ID,
  SOUND_CASE_001_STAGE_2_CLUE_CARD,
} from "./quests/sound-case-001/vibratingCards";

type QuestPageDefinitionBase<TType extends string> = {
  id: string;
  type: TType;
  printOrder: number;
  printable: boolean;
  title?: LocalizedString;
};

export type SoundCardsPageDefinition = QuestPageDefinitionBase<"sound-cards"> & {
  sheetCount: 2;
  side: "front";
  pairId: SoundCardSheetPairId;
  duplexMode: SoundCardDuplexMode;
} & (
    | {
        sheetNumber: 1;
        cardIds: SoundCardFullSheetSelection;
        unknownSoundCard?: never;
      }
    | {
        sheetNumber: 2;
        cardIds: SoundCardPartialSheetSelection;
        unknownSoundCard: UnknownSoundCardDefinition;
        introCard: IntroCardDefinition;
      }
  );

export type SoundCardSheetPairId =
  | "sound-cards-sheet-1"
  | "sound-cards-sheet-2";

export type SoundCardBacksPageDefinition =
  QuestPageDefinitionBase<"sound-card-backs"> & {
    sheetCount: 2;
    side: "back";
    pairId: SoundCardSheetPairId;
    duplexMode: SoundCardDuplexMode;
    backAssetId: "stage-1-card-back";
  } & (
      | {
          sheetNumber: 1;
          cards: SoundCardFullBackSelection;
          unknownSoundCard?: never;
        }
      | {
          sheetNumber: 2;
          cards: SoundCardPartialBackSelection;
          unknownSoundCard: UnknownSoundCardDefinition;
          introCard: IntroCardDefinition;
        }
    );

export type Stage1CardBoxPageDefinition =
  QuestPageDefinitionBase<"stage-1-card-box"> & {
    side: "single";
    dielineId: SoundCase001CardBoxDielineId;
  };

export type Stage2VibratingCardsPageDefinition =
  QuestPageDefinitionBase<"stage-2-vibrating-cards"> & {
    side: "front";
    pairId: "stage-2-clue-sheet";
    duplexMode: SoundCardDuplexMode;
    locale: Lang;
    clue: typeof SOUND_CASE_001_STAGE_2_CLUE_CARD;
  };

export type Stage2ClueBackPageDefinition =
  QuestPageDefinitionBase<"stage-2-clue-back"> & {
    side: "back";
    pairId: "stage-2-clue-sheet";
    duplexMode: SoundCardDuplexMode;
    locale: Lang;
    clue: typeof SOUND_CASE_001_STAGE_2_CLUE_CARD;
  };

export type Stage2BoxPageDefinition =
  QuestPageDefinitionBase<"stage-2-box"> & {
    side: "single";
    locale: Lang;
    dielineId: typeof SOUND_CASE_001_STAGE_2_BOX_DIELINE_ID;
    includesOverflowVibratingCard: boolean;
  };

/**
 * Discriminated union for printable document definitions.
 *
 * To add a page type: define its type-specific definition, add it to this
 * union, create and register its renderer, then add a definition to the
 * document configuration.
 */
export type QuestPageDefinition =
  | SoundCardsPageDefinition
  | SoundCardBacksPageDefinition
  | Stage1CardBoxPageDefinition
  | Stage2VibratingCardsPageDefinition
  | Stage2ClueBackPageDefinition
  | Stage2BoxPageDefinition;

export type QuestPageType = QuestPageDefinition["type"];

export type QuestPageDefinitionByType = {
  [TType in QuestPageType]: Extract<QuestPageDefinition, { type: TType }>;
};

export const SOUND_CASE_001_PAGES = [
  {
    id: "sound-case-001-sound-cards-1",
    type: "sound-cards",
    printOrder: 1,
    printable: true,
    cardIds: [
      "sound-card-01",
      "sound-card-02",
      "sound-card-03",
      "sound-card-04",
      "sound-card-05",
      "sound-card-06",
      "sound-card-07",
      "sound-card-08",
      "sound-card-09",
    ],
    sheetNumber: 1,
    sheetCount: 2,
    side: "front",
    pairId: "sound-cards-sheet-1",
    duplexMode: SOUND_CARD_DUPLEX_MODE,
  },
  {
    id: "sound-case-001-sound-card-backs-1",
    type: "sound-card-backs",
    printOrder: 2,
    printable: true,
    cards: SOUND_CARD_BACK_SHEET_1,
    backAssetId: "stage-1-card-back",
    sheetNumber: 1,
    sheetCount: 2,
    side: "back",
    pairId: "sound-cards-sheet-1",
    duplexMode: SOUND_CARD_DUPLEX_MODE,
  },
  {
    id: "sound-case-001-sound-cards-2",
    type: "sound-cards",
    printOrder: 3,
    printable: true,
    cardIds: [
      "sound-card-10",
      "sound-card-11",
      "sound-card-12",
    ],
    sheetNumber: 2,
    sheetCount: 2,
    side: "front",
    pairId: "sound-cards-sheet-2",
    duplexMode: SOUND_CARD_DUPLEX_MODE,
    unknownSoundCard: SOUND_CASE_001_UNKNOWN_SOUND_CARD,
    introCard: SOUND_CASE_001_INTRO_CARD,
  },
  {
    id: "sound-case-001-sound-card-backs-2",
    type: "sound-card-backs",
    printOrder: 4,
    printable: true,
    cards: SOUND_CARD_BACK_SHEET_2,
    backAssetId: "stage-1-card-back",
    sheetNumber: 2,
    sheetCount: 2,
    side: "back",
    pairId: "sound-cards-sheet-2",
    duplexMode: SOUND_CARD_DUPLEX_MODE,
    unknownSoundCard: SOUND_CASE_001_UNKNOWN_SOUND_CARD,
    introCard: SOUND_CASE_001_INTRO_CARD,
  },
  {
    id: "sound-case-001-stage-1-card-box",
    type: "stage-1-card-box",
    printOrder: 5,
    printable: true,
    side: "single",
    dielineId: SOUND_CASE_001_CARD_BOX_DIELINE_ID,
    title: {
      ru: "Коробочка для карточек этапа 01",
      en: "Stage 01 card box",
      he: "קופסת קלפים לשלב 01",
    },
  },
] satisfies readonly QuestPageDefinition[];

export function getSoundCase001Stage2Pages(
  locale: Lang,
): readonly QuestPageDefinition[] {
  return [
    {
      id: `sound-case-001-stage-2-vibrating-cards-${locale}`,
      type: "stage-2-vibrating-cards",
      printOrder: 1,
      printable: true,
      side: "front",
      pairId: "stage-2-clue-sheet",
      duplexMode: SOUND_CARD_DUPLEX_MODE,
      locale,
      clue: SOUND_CASE_001_STAGE_2_CLUE_CARD,
    },
    {
      id: `sound-case-001-stage-2-clue-back-${locale}`,
      type: "stage-2-clue-back",
      printOrder: 2,
      printable: true,
      side: "back",
      pairId: "stage-2-clue-sheet",
      duplexMode: SOUND_CARD_DUPLEX_MODE,
      locale,
      clue: SOUND_CASE_001_STAGE_2_CLUE_CARD,
    },
    {
      id: `sound-case-001-stage-2-box-${locale}`,
      type: "stage-2-box",
      printOrder: 3,
      printable: true,
      side: "single",
      locale,
      dielineId: SOUND_CASE_001_STAGE_2_BOX_DIELINE_ID,
      includesOverflowVibratingCard: false,
      title: {
        ru: "Коробочка для дрожащих карточек",
        en: "Vibrating Cards box",
        he: "קופסה לקלפים הרועדים",
      },
    },
  ];
}

export function getPrintableQuestPages(
  pages: readonly QuestPageDefinition[],
): QuestPageDefinition[] {
  return pages
    .map((page, sourceIndex) => ({ page, sourceIndex }))
    .filter(({ page }) => page.printable)
    .sort(
      (a, b) =>
        a.page.printOrder - b.page.printOrder ||
        a.sourceIndex - b.sourceIndex,
    )
    .map(({ page }) => page);
}
