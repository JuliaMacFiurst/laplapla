import type { LocalizedString } from "./types";
import type { SoundCase001VisualAssetId } from "./quests/sound-case-001/assets";
import type {
  SoundCardDuplexMode,
  SoundCardFullBackSelection,
  SoundCardFullSheetSelection,
  SoundCardPartialBackSelection,
  SoundCardPartialSheetSelection,
} from "./quests/sound-case-001/soundCards";
import type { UnknownSoundCardDefinition } from "./quests/sound-case-001/unknownSoundCard";
import {
  SOUND_CARD_BACK_SHEET_1,
  SOUND_CARD_BACK_SHEET_2,
  SOUND_CARD_DUPLEX_MODE,
} from "./quests/sound-case-001/soundCards";
import { SOUND_CASE_001_UNKNOWN_SOUND_CARD } from "./quests/sound-case-001/unknownSoundCard";

type QuestPageDefinitionBase<TType extends string> = {
  id: string;
  type: TType;
  printOrder: number;
  printable: boolean;
  title?: LocalizedString;
};

export type CaseCoverPageDefinition = QuestPageDefinitionBase<"case-cover"> & {
  /** Optional decoration slot resolved from the quest asset manifest by the renderer. */
  decorationAssetId?: SoundCase001VisualAssetId;
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
        }
    );

/**
 * Discriminated union for printable document definitions.
 *
 * To add a page type: define its type-specific definition, add it to this
 * union, create and register its renderer, then add a definition to the
 * document configuration.
 */
export type QuestPageDefinition =
  | CaseCoverPageDefinition
  | SoundCardsPageDefinition
  | SoundCardBacksPageDefinition;

export type QuestPageType = QuestPageDefinition["type"];

export type QuestPageDefinitionByType = {
  [TType in QuestPageType]: Extract<QuestPageDefinition, { type: TType }>;
};

export const SOUND_CASE_001_PAGES = [
  {
    id: "sound-case-001-case-cover",
    type: "case-cover",
    printOrder: 1,
    printable: true,
    decorationAssetId: "case-cover-decoration",
    title: {
      ru: "Обложка дела",
      en: "Case cover",
      he: "שער התיק",
    },
  },
  {
    id: "sound-case-001-sound-cards-1",
    type: "sound-cards",
    printOrder: 2,
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
    printOrder: 3,
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
    printOrder: 4,
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
  },
  {
    id: "sound-case-001-sound-card-backs-2",
    type: "sound-card-backs",
    printOrder: 5,
    printable: true,
    cards: SOUND_CARD_BACK_SHEET_2,
    backAssetId: "stage-1-card-back",
    sheetNumber: 2,
    sheetCount: 2,
    side: "back",
    pairId: "sound-cards-sheet-2",
    duplexMode: SOUND_CARD_DUPLEX_MODE,
    unknownSoundCard: SOUND_CASE_001_UNKNOWN_SOUND_CARD,
  },
] satisfies readonly QuestPageDefinition[];

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
