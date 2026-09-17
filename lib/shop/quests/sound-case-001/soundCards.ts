import type { SoundCase001SoundCardAssetId } from "./assets";

export type SoundCardModifier =
  | "reverse"
  | "nose-pinched"
  | "hand-megaphone";

export type SoundCardAccent =
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
  | "magenta";

export type SoundCardTitleSize = "normal" | "long" | "extra-long";

export type SoundCardTitleKey =
  | "ketchup"
  | "sneezeCat"
  | "snortingLaugh"
  | "tinyAngryDog"
  | "selfScaredSnore"
  | "hiccupHorse"
  | "singingRooster"
  | "operaLego"
  | "bassSeagull"
  | "evilGoat"
  | "throatSinging"
  | "rakeAsphalt";

export type SoundCardDefinition = {
  id: string;
  number: number;
  illustrationAssetId: SoundCase001SoundCardAssetId;
  titleKey: SoundCardTitleKey;
  accent: SoundCardAccent;
  titleSize: SoundCardTitleSize;
  modifier?: SoundCardModifier;
};

export const SOUND_CASE_001_SOUND_CARDS = [
  {
    id: "sound-card-01",
    number: 1,
    illustrationAssetId: "stage-1-sound-card-01-ketchup",
    titleKey: "ketchup",
    accent: "red",
    titleSize: "long",
    modifier: undefined,
  },
  {
    id: "sound-card-02",
    number: 2,
    illustrationAssetId: "stage-1-sound-card-02-sneeze-cat",
    titleKey: "sneezeCat",
    accent: "cyan",
    titleSize: "extra-long",
    modifier: "nose-pinched",
  },
  {
    id: "sound-card-03",
    number: 3,
    illustrationAssetId: "stage-1-sound-card-03-snorting-laugh",
    titleKey: "snortingLaugh",
    accent: "coral",
    titleSize: "normal",
    modifier: undefined,
  },
  {
    id: "sound-card-04",
    number: 4,
    illustrationAssetId: "stage-1-sound-card-04-tiny-angry-dog",
    titleKey: "tinyAngryDog",
    accent: "amber",
    titleSize: "long",
    modifier: undefined,
  },
  {
    id: "sound-card-05",
    number: 5,
    illustrationAssetId: "stage-1-sound-card-05-self-scared-snore",
    titleKey: "selfScaredSnore",
    accent: "blue",
    titleSize: "extra-long",
    modifier: undefined,
  },
  {
    id: "sound-card-06",
    number: 6,
    illustrationAssetId: "stage-1-sound-card-06-hiccup-horse",
    titleKey: "hiccupHorse",
    accent: "orange",
    titleSize: "long",
    modifier: undefined,
  },
  {
    id: "sound-card-07",
    number: 7,
    illustrationAssetId: "stage-1-sound-card-07-singing-rooster",
    titleKey: "singingRooster",
    accent: "green",
    titleSize: "long",
    modifier: "reverse",
  },
  {
    id: "sound-card-08",
    number: 8,
    illustrationAssetId: "stage-1-sound-card-08-opera-lego",
    titleKey: "operaLego",
    accent: "violet",
    titleSize: "extra-long",
    modifier: undefined,
  },
  {
    id: "sound-card-09",
    number: 9,
    illustrationAssetId: "stage-1-sound-card-09-bass-seagull",
    titleKey: "bassSeagull",
    accent: "teal",
    titleSize: "normal",
    modifier: "hand-megaphone",
  },
  {
    id: "sound-card-10",
    number: 10,
    illustrationAssetId: "stage-1-sound-card-10-evil-goat",
    titleKey: "evilGoat",
    accent: "magenta",
    titleSize: "normal",
    modifier: undefined,
  },
  {
    id: "sound-card-11",
    number: 11,
    illustrationAssetId: "stage-1-sound-card-11-throat-singing",
    titleKey: "throatSinging",
    accent: "indigo",
    titleSize: "normal",
    modifier: undefined,
  },
  {
    id: "sound-card-12",
    number: 12,
    illustrationAssetId: "stage-1-sound-card-12-rake-asphalt",
    titleKey: "rakeAsphalt",
    accent: "yellow",
    titleSize: "normal",
    modifier: undefined,
  },
] as const satisfies readonly SoundCardDefinition[];

export type SoundCardId = (typeof SOUND_CASE_001_SOUND_CARDS)[number]["id"];

export type SoundCardFullSheetSelection = readonly [
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
];

export type SoundCardPartialSheetSelection = readonly [
  SoundCardId,
  SoundCardId,
  SoundCardId,
];

export type SoundCardSheetSelection =
  | SoundCardFullSheetSelection
  | SoundCardPartialSheetSelection;

export type SoundCardSheetSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const SOUND_CARD_SHEET_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function getSoundCardSheetSlot(index: number): SoundCardSheetSlot {
  const slot = SOUND_CARD_SHEET_SLOTS[index];
  if (!slot) {
    throw new Error(`Sound Card sheet index is outside the 3×3 grid: ${index}`);
  }
  return slot;
}

export const SOUND_CARD_DUPLEX_MODE = "flip-long-edge" as const;
export type SoundCardDuplexMode = typeof SOUND_CARD_DUPLEX_MODE;

export type SoundCardBackPlacement = {
  cardId: SoundCardId;
  frontSlot: SoundCardSheetSlot;
  backSlot: SoundCardSheetSlot;
};

export type SoundCardFullBackSelection = readonly [
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
];

export type SoundCardPartialBackSelection = readonly [
  SoundCardBackPlacement,
  SoundCardBackPlacement,
  SoundCardBackPlacement,
];

/**
 * A4 portrait duplex mapping for "flip on long edge".
 * Rows stay fixed and columns mirror: 1↔3, 4↔6, 7↔9.
 */
export function getLongEdgeBackSlot(
  frontSlot: SoundCardSheetSlot,
): SoundCardSheetSlot {
  switch (frontSlot) {
    case 1: return 3;
    case 2: return 2;
    case 3: return 1;
    case 4: return 6;
    case 5: return 5;
    case 6: return 4;
    case 7: return 9;
    case 8: return 8;
    case 9: return 7;
  }
}

export const SOUND_CARD_BACK_SHEET_1 = [
  { cardId: "sound-card-01", frontSlot: 1, backSlot: 3 },
  { cardId: "sound-card-02", frontSlot: 2, backSlot: 2 },
  { cardId: "sound-card-03", frontSlot: 3, backSlot: 1 },
  { cardId: "sound-card-04", frontSlot: 4, backSlot: 6 },
  { cardId: "sound-card-05", frontSlot: 5, backSlot: 5 },
  { cardId: "sound-card-06", frontSlot: 6, backSlot: 4 },
  { cardId: "sound-card-07", frontSlot: 7, backSlot: 9 },
  { cardId: "sound-card-08", frontSlot: 8, backSlot: 8 },
  { cardId: "sound-card-09", frontSlot: 9, backSlot: 7 },
] as const satisfies SoundCardFullBackSelection;

export const SOUND_CARD_BACK_SHEET_2 = [
  { cardId: "sound-card-10", frontSlot: 1, backSlot: 3 },
  { cardId: "sound-card-11", frontSlot: 2, backSlot: 2 },
  { cardId: "sound-card-12", frontSlot: 3, backSlot: 1 },
] as const satisfies SoundCardPartialBackSelection;

export function getSoundCardsByIds(
  cardIds: SoundCardSheetSelection,
): SoundCardDefinition[] {
  return cardIds.map((cardId) => {
    const card = SOUND_CASE_001_SOUND_CARDS.find(({ id }) => id === cardId);

    if (!card) {
      throw new Error(`Unknown Sound Card: ${cardId}`);
    }

    return card;
  });
}
