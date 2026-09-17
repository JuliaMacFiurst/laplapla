import type { LocalizedString } from "./types";
import type { SoundCase001VisualAssetId } from "./quests/sound-case-001/assets";
import type {
  SoundCardSheetSelection,
} from "./quests/sound-case-001/soundCards";

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
  cardIds: SoundCardSheetSelection;
  sheetNumber: 1 | 2;
  sheetCount: 2;
};

/**
 * Discriminated union for printable document definitions.
 *
 * To add a page type: define its type-specific definition, add it to this
 * union, create and register its renderer, then add a definition to the
 * document configuration.
 */
export type QuestPageDefinition =
  | CaseCoverPageDefinition
  | SoundCardsPageDefinition;

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
    ],
    sheetNumber: 1,
    sheetCount: 2,
  },
  {
    id: "sound-case-001-sound-cards-2",
    type: "sound-cards",
    printOrder: 3,
    printable: true,
    cardIds: [
      "sound-card-07",
      "sound-card-08",
      "sound-card-09",
      "sound-card-10",
      "sound-card-11",
      "sound-card-12",
    ],
    sheetNumber: 2,
    sheetCount: 2,
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
