import type {
  QuestAssetIdsByKind,
  QuestAssetManifest,
  QuestAudioAsset,
  QuestVisualAsset,
} from "../../questAssets";

export type SoundCase001AssetEntries = {
  readonly "sound-lab-parrot": QuestVisualAsset<"sound-lab-parrot">;
  readonly "unknown-sound-digital-parrot": QuestVisualAsset<"unknown-sound-digital-parrot">;
  readonly "unknown-sound-studio-background": QuestVisualAsset<"unknown-sound-studio-background">;
  readonly "case-cover-decoration": QuestVisualAsset<"case-cover-decoration">;
  readonly "stage-1-sound-card-01-ketchup": QuestVisualAsset<"stage-1-sound-card-01-ketchup">;
  readonly "stage-1-sound-card-02-sneeze-cat": QuestVisualAsset<"stage-1-sound-card-02-sneeze-cat">;
  readonly "stage-1-sound-card-03-snorting-laugh": QuestVisualAsset<"stage-1-sound-card-03-snorting-laugh">;
  readonly "stage-1-sound-card-04-tiny-angry-dog": QuestVisualAsset<"stage-1-sound-card-04-tiny-angry-dog">;
  readonly "stage-1-sound-card-05-self-scared-snore": QuestVisualAsset<"stage-1-sound-card-05-self-scared-snore">;
  readonly "stage-1-sound-card-06-hiccup-horse": QuestVisualAsset<"stage-1-sound-card-06-hiccup-horse">;
  readonly "stage-1-sound-card-07-singing-rooster": QuestVisualAsset<"stage-1-sound-card-07-singing-rooster">;
  readonly "stage-1-sound-card-08-opera-lego": QuestVisualAsset<"stage-1-sound-card-08-opera-lego">;
  readonly "stage-1-sound-card-09-bass-seagull": QuestVisualAsset<"stage-1-sound-card-09-bass-seagull">;
  readonly "stage-1-sound-card-10-evil-goat": QuestVisualAsset<"stage-1-sound-card-10-evil-goat">;
  readonly "stage-1-sound-card-11-throat-singing": QuestVisualAsset<"stage-1-sound-card-11-throat-singing">;
  readonly "stage-1-sound-card-12-rake-asphalt": QuestVisualAsset<"stage-1-sound-card-12-rake-asphalt">;
  readonly "stage-1-card-back": QuestVisualAsset<"stage-1-card-back">;
  readonly "stage-1-unknown-sound-visual": QuestVisualAsset<"stage-1-unknown-sound-visual">;
  readonly "stage-1-unknown-recording": QuestAudioAsset<"stage-1-unknown-recording">;
};

export type SoundCase001AssetManifest = QuestAssetManifest<
  "sound-case-001",
  SoundCase001AssetEntries
>;

export type SoundCase001AssetId = keyof SoundCase001AssetEntries;

export type SoundCase001VisualAssetId = QuestAssetIdsByKind<
  SoundCase001AssetEntries,
  "visual"
>;

export type SoundCase001AudioAssetId = QuestAssetIdsByKind<
  SoundCase001AssetEntries,
  "audio"
>;

export type SoundCase001SoundCardAssetId = Extract<
  SoundCase001VisualAssetId,
  `stage-1-sound-card-${string}`
>;

const UNCONFIGURED_SOURCE = { status: "unconfigured" } as const;
const SOUND_CARD_PUBLIC_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/sound-cards";
const UNKNOWN_SOUND_PUBLIC_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-01-sound-crocodile/unknown-sound";

type SupplementalSoundCardAssetPath =
  | "assets/stage-1-unknown-sound-parrot.webp"
  | "assets/stage-1-unknown-sound-parrot-2.webp"
  | "backgrounds/stage-1-unknown-sound-sound-lab.webp"
  | "backs/stage-1-sound-card-back.webp";

const externalSoundCardAsset = (
  path: SoundCardAssetFileName | SupplementalSoundCardAssetPath,
) => ({
  status: "external" as const,
  url: `${SOUND_CARD_PUBLIC_BASE_URL}/${path}`,
});

type SoundCardAssetFileName =
  | "stage-1-sound-card-01-ketchup.webp"
  | "stage-1-sound-card-02-sneeze-cat.webp"
  | "stage-1-sound-card-03-snorting-laugh.webp"
  | "stage-1-sound-card-04-tiny-angry-dog.webp"
  | "stage-1-sound-card-05-self-scared-snore.webp"
  | "stage-1-sound-card-06-hiccup-horse.webp"
  | "stage-1-sound-card-07-singing-rooster.webp"
  | "stage-1-sound-card-08-opera-lego.webp"
  | "stage-1-sound-card-09-bass-seagull.webp"
  | "stage-1-sound-card-10-evil-goat.webp"
  | "stage-1-sound-card-11-throat-singing.webp"
  | "stage-1-sound-card-12-rake-asphalt.webp";

const soundCardSource = (fileName: SoundCardAssetFileName) => ({
  ...externalSoundCardAsset(fileName),
});

const unknownSoundAudioSource = (
  fileName: "unknown-sound-001-master.mp3",
) => ({
  status: "external" as const,
  url: `${UNKNOWN_SOUND_PUBLIC_BASE_URL}/audio/${fileName}`,
});

export const SOUND_CASE_001_ASSET_MANIFEST = {
  questId: "sound-case-001",
  assets: {
    "sound-lab-parrot": {
      id: "sound-lab-parrot",
      kind: "visual",
      source: externalSoundCardAsset(
        "assets/stage-1-unknown-sound-parrot.webp",
      ),
    },
    "unknown-sound-digital-parrot": {
      id: "unknown-sound-digital-parrot",
      kind: "visual",
      source: externalSoundCardAsset(
        "assets/stage-1-unknown-sound-parrot-2.webp",
      ),
    },
    "unknown-sound-studio-background": {
      id: "unknown-sound-studio-background",
      kind: "visual",
      source: externalSoundCardAsset(
        "backgrounds/stage-1-unknown-sound-sound-lab.webp",
      ),
    },
    "case-cover-decoration": {
      id: "case-cover-decoration",
      kind: "visual",
      source: UNCONFIGURED_SOURCE,
    },
    "stage-1-sound-card-01-ketchup": {
      id: "stage-1-sound-card-01-ketchup",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-01-ketchup.webp"),
    },
    "stage-1-sound-card-02-sneeze-cat": {
      id: "stage-1-sound-card-02-sneeze-cat",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-02-sneeze-cat.webp"),
    },
    "stage-1-sound-card-03-snorting-laugh": {
      id: "stage-1-sound-card-03-snorting-laugh",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-03-snorting-laugh.webp"),
    },
    "stage-1-sound-card-04-tiny-angry-dog": {
      id: "stage-1-sound-card-04-tiny-angry-dog",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-04-tiny-angry-dog.webp"),
    },
    "stage-1-sound-card-05-self-scared-snore": {
      id: "stage-1-sound-card-05-self-scared-snore",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-05-self-scared-snore.webp"),
    },
    "stage-1-sound-card-06-hiccup-horse": {
      id: "stage-1-sound-card-06-hiccup-horse",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-06-hiccup-horse.webp"),
    },
    "stage-1-sound-card-07-singing-rooster": {
      id: "stage-1-sound-card-07-singing-rooster",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-07-singing-rooster.webp"),
    },
    "stage-1-sound-card-08-opera-lego": {
      id: "stage-1-sound-card-08-opera-lego",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-08-opera-lego.webp"),
    },
    "stage-1-sound-card-09-bass-seagull": {
      id: "stage-1-sound-card-09-bass-seagull",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-09-bass-seagull.webp"),
    },
    "stage-1-sound-card-10-evil-goat": {
      id: "stage-1-sound-card-10-evil-goat",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-10-evil-goat.webp"),
    },
    "stage-1-sound-card-11-throat-singing": {
      id: "stage-1-sound-card-11-throat-singing",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-11-throat-singing.webp"),
    },
    "stage-1-sound-card-12-rake-asphalt": {
      id: "stage-1-sound-card-12-rake-asphalt",
      kind: "visual",
      source: soundCardSource("stage-1-sound-card-12-rake-asphalt.webp"),
    },
    "stage-1-card-back": {
      id: "stage-1-card-back",
      kind: "visual",
      source: externalSoundCardAsset(
        "backs/stage-1-sound-card-back.webp",
      ),
    },
    "stage-1-unknown-sound-visual": {
      id: "stage-1-unknown-sound-visual",
      kind: "visual",
      source: UNCONFIGURED_SOURCE,
    },
    "stage-1-unknown-recording": {
      id: "stage-1-unknown-recording",
      kind: "audio",
      source: unknownSoundAudioSource("unknown-sound-001-master.mp3"),
    },
  },
} satisfies SoundCase001AssetManifest;
