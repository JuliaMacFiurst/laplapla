import type { SoundCase001SoundCardAssetId } from "./assets";

export type SoundCardModifier =
  | "reverse"
  | "nose-pinched"
  | "hand-megaphone";

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
  modifier?: SoundCardModifier;
};

export const SOUND_CASE_001_SOUND_CARDS = [
  {
    id: "sound-card-01",
    number: 1,
    illustrationAssetId: "stage-1-sound-card-01-ketchup",
    titleKey: "ketchup",
    modifier: undefined,
  },
  {
    id: "sound-card-02",
    number: 2,
    illustrationAssetId: "stage-1-sound-card-02-sneeze-cat",
    titleKey: "sneezeCat",
    modifier: "nose-pinched",
  },
  {
    id: "sound-card-03",
    number: 3,
    illustrationAssetId: "stage-1-sound-card-03-snorting-laugh",
    titleKey: "snortingLaugh",
    modifier: undefined,
  },
  {
    id: "sound-card-04",
    number: 4,
    illustrationAssetId: "stage-1-sound-card-04-tiny-angry-dog",
    titleKey: "tinyAngryDog",
    modifier: undefined,
  },
  {
    id: "sound-card-05",
    number: 5,
    illustrationAssetId: "stage-1-sound-card-05-self-scared-snore",
    titleKey: "selfScaredSnore",
    modifier: undefined,
  },
  {
    id: "sound-card-06",
    number: 6,
    illustrationAssetId: "stage-1-sound-card-06-hiccup-horse",
    titleKey: "hiccupHorse",
    modifier: undefined,
  },
  {
    id: "sound-card-07",
    number: 7,
    illustrationAssetId: "stage-1-sound-card-07-singing-rooster",
    titleKey: "singingRooster",
    modifier: "reverse",
  },
  {
    id: "sound-card-08",
    number: 8,
    illustrationAssetId: "stage-1-sound-card-08-opera-lego",
    titleKey: "operaLego",
    modifier: undefined,
  },
  {
    id: "sound-card-09",
    number: 9,
    illustrationAssetId: "stage-1-sound-card-09-bass-seagull",
    titleKey: "bassSeagull",
    modifier: "hand-megaphone",
  },
  {
    id: "sound-card-10",
    number: 10,
    illustrationAssetId: "stage-1-sound-card-10-evil-goat",
    titleKey: "evilGoat",
    modifier: undefined,
  },
  {
    id: "sound-card-11",
    number: 11,
    illustrationAssetId: "stage-1-sound-card-11-throat-singing",
    titleKey: "throatSinging",
    modifier: undefined,
  },
  {
    id: "sound-card-12",
    number: 12,
    illustrationAssetId: "stage-1-sound-card-12-rake-asphalt",
    titleKey: "rakeAsphalt",
    modifier: undefined,
  },
] as const satisfies readonly SoundCardDefinition[];

export type SoundCardId = (typeof SOUND_CASE_001_SOUND_CARDS)[number]["id"];

export type SoundCardSheetSelection = readonly [
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
  SoundCardId,
];

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
