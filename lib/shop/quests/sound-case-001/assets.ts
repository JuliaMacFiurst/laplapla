import type {
  QuestAssetIdsByKind,
  QuestAssetManifest,
  QuestAudioAsset,
  QuestVisualAsset,
} from "../../questAssets";
import type { DistractorId } from "./humanEqualizerGame";

type SoundCase001Stage1AssetEntries = {
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

export type SoundCase001Stage2VibrationCardAssetId =
  | "stage-2-vibration-card-ru-01-vi"
  | "stage-2-vibration-card-ru-02-b"
  | "stage-2-vibration-card-ru-03-ra"
  | "stage-2-vibration-card-ru-04-tsi"
  | "stage-2-vibration-card-ru-05-ya"
  | "stage-2-vibration-card-ru-06-pe"
  | "stage-2-vibration-card-ru-07-s"
  | "stage-2-vibration-card-ru-08-ka"
  | "stage-2-vibration-card-en-a"
  | "stage-2-vibration-card-en-b"
  | "stage-2-vibration-card-en-d"
  | "stage-2-vibration-card-en-n"
  | "stage-2-vibration-card-en-on"
  | "stage-2-vibration-card-en-ra"
  | "stage-2-vibration-card-en-s"
  | "stage-2-vibration-card-en-ti"
  | "stage-2-vibration-card-en-vi"
  | "stage-2-vibration-card-he-01-t"
  | "stage-2-vibration-card-he-02-nu"
  | "stage-2-vibration-card-he-03-d"
  | "stage-2-vibration-card-he-04-ot"
  | "stage-2-vibration-card-he-05-ba"
  | "stage-2-vibration-card-he-06-h"
  | "stage-2-vibration-card-he-07-o"
  | "stage-2-vibration-card-he-08-l";

export type SoundCase001Stage2VisualAssetId =
  | SoundCase001Stage2VibrationCardAssetId
  | "stage-2-parrot"
  | "stage-2-digital-background"
  | "stage-2-digital-parrot-2"
  | "stage-2-sand-bag";

export type SoundCase001Stage3DistractorAssetId = `stage-3-distractor-${DistractorId}`;
export type SoundCase001Stage4GestureAssetId =
  | "stage-4-gesture-clap"
  | "stage-4-gesture-snap"
  | "stage-4-gesture-knee-pat"
  | "stage-4-gesture-pause";

export type SoundCase001Stage4ExperimentAssetId =
  | "stage-4-clap-together"
  | "stage-4-clap-out-of-sync";

export type SoundCase001Stage4VisualAssetId =
  | SoundCase001Stage4GestureAssetId
  | SoundCase001Stage4ExperimentAssetId;

export type SoundCase001Stage5VisualAssetId =
  | "stage-5-dune-background"
  | "stage-5-dune-puzzle"
  | `stage-5-sand-sample-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type SoundCase001Stage6AudioAssetId =
  | "stage-6-sound-cat"
  | "stage-6-sound-bell"
  | "stage-6-sound-train"
  | "stage-6-sound-chicken"
  | "stage-6-sound-door"
  | "stage-6-sound-mosquito"
  | "stage-6-sound-balloon"
  | "stage-6-sound-dog";

export type SoundCase001AssetEntries = SoundCase001Stage1AssetEntries & {
  readonly [TId in SoundCase001Stage2VisualAssetId]: QuestVisualAsset<TId>;
} & {
  readonly [TId in SoundCase001Stage3DistractorAssetId]: QuestAudioAsset<TId>;
} & {
  readonly [TId in SoundCase001Stage4VisualAssetId]: QuestVisualAsset<TId>;
} & {
  readonly [TId in SoundCase001Stage5VisualAssetId]: QuestVisualAsset<TId>;
} & {
  readonly [TId in SoundCase001Stage6AudioAssetId]: QuestAudioAsset<TId>;
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
const STAGE_2_PUBLIC_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-02-vibrating-cards";
const STAGE_3_AUDIO_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-03-human-equalizer/audio";
const STAGE_4_ASSET_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-04-broken-rhythm/assets";
const STAGE_5_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-05-scattered-sand";
const STAGE_6_AUDIO_BASE_URL =
  "https://media.laplapla.com/quests/sound-case-001/stage-06-decoding-of-coordinates/audio";

export const STAGE_6_AUDIO_FILES = {
  cat: "mixkit-sweet-kitty-meow-93.mp3",
  bell: "mixkit-bike-bell-ring-595.mp3",
  train: "mixkit-train-passenger-passing-by-rattle-1636.mp3",
  chicken: "mixkit-rooster-crowing-in-the-morning-2462.mp3",
  door: "mixkit-creaking-door-open-and-close-199.mp3",
  mosquito: "mixkit-cartoon-mosquito-flying-328.mp3",
  balloon: "mixkit-farting-balloon-deflate-3052.mp3",
  dog: "mixkit-medium-size-angry-dog-bark-54.mp3",
} as const;

export const STAGE_3_DISTRACTOR_FILES = {
  "cartoon-sneeze": "mixkit-cartoon-sneeze-747.mp3",
  "clown-horn": "mixkit-clown-horn-at-circus-715.mp3",
  "squeaky-toy": "mixkit-clown-squeaky-toy-2816.mp3",
  cow: "mixkit-cow-moo-in-the-barn-1751.mp3",
  "flute-whistle": "mixkit-flute-toy-whistle-2812.mp3",
  splat: "mixkit-funny-cartoon-fast-splat-2889.mp3",
  "metal-smash": "mixkit-heavy-sword-smashes-metal-2795.mp3",
  "cartoon-laugh": "mixkit-laughing-cartoon-creature-414.mp3",
  rattle: "mixkit-rattle-toy-shaking-2824.mp3",
  duck: "mixkit-rubber-duck-squeak-1014.mp3",
  "rubber-squeak": "mixkit-rubber-squeaking-1009.mp3",
  trombone: "mixkit-sad-game-over-trombone-471.mp3",
  "human-sneeze": "mixkit-sick-man-sneeze-2213.mp3",
  "spinning-whistle": "mixkit-spinning-whistle-toy-2647.mp3",
} as const satisfies Record<DistractorId, string>;

const stage3DistractorSource = (fileName: typeof STAGE_3_DISTRACTOR_FILES[DistractorId]) => ({
  status: "external" as const,
  url: `${STAGE_3_AUDIO_BASE_URL}/${fileName}`,
});

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

const stage2VisualSource = (path: string) => ({
  status: "external" as const,
  url: `${STAGE_2_PUBLIC_BASE_URL}/${path}`,
});

const stage4VisualSource = (fileName: string) => ({
  status: "external" as const,
  url: `${STAGE_4_ASSET_BASE_URL}/${fileName}`,
});

const stage5VisualSource = (path: string) => ({
  status: "external" as const,
  url: `${STAGE_5_BASE_URL}/${path}`,
});

const stage6AudioSource = (fileName: typeof STAGE_6_AUDIO_FILES[keyof typeof STAGE_6_AUDIO_FILES]) => ({
  status: "external" as const,
  url: `${STAGE_6_AUDIO_BASE_URL}/${fileName}`,
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
    "stage-2-vibration-card-ru-01-vi": {
      id: "stage-2-vibration-card-ru-01-vi", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-01-vi.webp"),
    },
    "stage-2-vibration-card-ru-02-b": {
      id: "stage-2-vibration-card-ru-02-b", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-02-b.webp"),
    },
    "stage-2-vibration-card-ru-03-ra": {
      id: "stage-2-vibration-card-ru-03-ra", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-03-ra.webp"),
    },
    "stage-2-vibration-card-ru-04-tsi": {
      id: "stage-2-vibration-card-ru-04-tsi", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-04-tsi.webp"),
    },
    "stage-2-vibration-card-ru-05-ya": {
      id: "stage-2-vibration-card-ru-05-ya", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-05-ya.webp"),
    },
    "stage-2-vibration-card-ru-06-pe": {
      id: "stage-2-vibration-card-ru-06-pe", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-06-pe.webp"),
    },
    "stage-2-vibration-card-ru-07-s": {
      id: "stage-2-vibration-card-ru-07-s", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-07-s.webp"),
    },
    "stage-2-vibration-card-ru-08-ka": {
      id: "stage-2-vibration-card-ru-08-ka", kind: "visual",
      source: stage2VisualSource("cards/rus/stage-2-vibration-card-08-ka.webp"),
    },
    "stage-2-vibration-card-en-a": {
      id: "stage-2-vibration-card-en-a", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-a.webp"),
    },
    "stage-2-vibration-card-en-b": {
      id: "stage-2-vibration-card-en-b", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-b.webp"),
    },
    "stage-2-vibration-card-en-d": {
      id: "stage-2-vibration-card-en-d", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-d.webp"),
    },
    "stage-2-vibration-card-en-n": {
      id: "stage-2-vibration-card-en-n", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-n.webp"),
    },
    "stage-2-vibration-card-en-on": {
      id: "stage-2-vibration-card-en-on", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-on.webp"),
    },
    "stage-2-vibration-card-en-ra": {
      id: "stage-2-vibration-card-en-ra", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-ra.webp"),
    },
    "stage-2-vibration-card-en-s": {
      id: "stage-2-vibration-card-en-s", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-s.webp"),
    },
    "stage-2-vibration-card-en-ti": {
      id: "stage-2-vibration-card-en-ti", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-ti.webp"),
    },
    "stage-2-vibration-card-en-vi": {
      id: "stage-2-vibration-card-en-vi", kind: "visual",
      source: stage2VisualSource("cards/eng/stage-2-vibration-card-vi.webp"),
    },
    "stage-2-vibration-card-he-01-t": {
      id: "stage-2-vibration-card-he-01-t", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-01-t.webp"),
    },
    "stage-2-vibration-card-he-02-nu": {
      id: "stage-2-vibration-card-he-02-nu", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-02-nu.webp"),
    },
    "stage-2-vibration-card-he-03-d": {
      id: "stage-2-vibration-card-he-03-d", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-03-d.webp"),
    },
    "stage-2-vibration-card-he-04-ot": {
      id: "stage-2-vibration-card-he-04-ot", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-04-ot.webp"),
    },
    "stage-2-vibration-card-he-05-ba": {
      id: "stage-2-vibration-card-he-05-ba", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-05-ba.webp"),
    },
    "stage-2-vibration-card-he-06-h": {
      id: "stage-2-vibration-card-he-06-h", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-06-h.webp"),
    },
    "stage-2-vibration-card-he-07-o": {
      id: "stage-2-vibration-card-he-07-o", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-07-o.webp"),
    },
    "stage-2-vibration-card-he-08-l": {
      id: "stage-2-vibration-card-he-08-l", kind: "visual",
      source: stage2VisualSource("cards/he/stage-2-vibration-card-08-l.webp"),
    },
    "stage-2-parrot": {
      id: "stage-2-parrot", kind: "visual",
      source: stage2VisualSource("assets/parrot.webp"),
    },
    "stage-2-digital-background": {
      id: "stage-2-digital-background", kind: "visual",
      source: stage2VisualSource("assets/stage-2-clue-sand-studio-background.webp"),
    },
    "stage-2-digital-parrot-2": {
      id: "stage-2-digital-parrot-2", kind: "visual",
      source: stage2VisualSource("assets/parrot2.webp"),
    },
    "stage-2-sand-bag": {
      id: "stage-2-sand-bag", kind: "visual",
      source: stage2VisualSource("assets/sand.webp"),
    },
    "stage-3-distractor-cow": {
      id: "stage-3-distractor-cow", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES.cow),
    },
    "stage-3-distractor-duck": {
      id: "stage-3-distractor-duck", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES.duck),
    },
    "stage-3-distractor-cartoon-sneeze": {
      id: "stage-3-distractor-cartoon-sneeze", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["cartoon-sneeze"]),
    },
    "stage-3-distractor-clown-horn": {
      id: "stage-3-distractor-clown-horn", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["clown-horn"]),
    },
    "stage-3-distractor-squeaky-toy": {
      id: "stage-3-distractor-squeaky-toy", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["squeaky-toy"]),
    },
    "stage-3-distractor-flute-whistle": {
      id: "stage-3-distractor-flute-whistle", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["flute-whistle"]),
    },
    "stage-3-distractor-splat": {
      id: "stage-3-distractor-splat", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES.splat),
    },
    "stage-3-distractor-metal-smash": {
      id: "stage-3-distractor-metal-smash", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["metal-smash"]),
    },
    "stage-3-distractor-cartoon-laugh": {
      id: "stage-3-distractor-cartoon-laugh", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["cartoon-laugh"]),
    },
    "stage-3-distractor-rattle": {
      id: "stage-3-distractor-rattle", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES.rattle),
    },
    "stage-3-distractor-rubber-squeak": {
      id: "stage-3-distractor-rubber-squeak", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["rubber-squeak"]),
    },
    "stage-3-distractor-trombone": {
      id: "stage-3-distractor-trombone", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES.trombone),
    },
    "stage-3-distractor-human-sneeze": {
      id: "stage-3-distractor-human-sneeze", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["human-sneeze"]),
    },
    "stage-3-distractor-spinning-whistle": {
      id: "stage-3-distractor-spinning-whistle", kind: "audio",
      source: stage3DistractorSource(STAGE_3_DISTRACTOR_FILES["spinning-whistle"]),
    },
    "stage-4-gesture-clap": {
      id: "stage-4-gesture-clap", kind: "visual",
      source: stage4VisualSource("stage-4-beat-clap.webp"),
    },
    "stage-4-gesture-snap": {
      id: "stage-4-gesture-snap", kind: "visual",
      source: stage4VisualSource("stage-4-beat-finger-snap.webp"),
    },
    "stage-4-gesture-knee-pat": {
      id: "stage-4-gesture-knee-pat", kind: "visual",
      source: stage4VisualSource("stage-4-beat-knee-pat.webp"),
    },
    "stage-4-gesture-pause": {
      id: "stage-4-gesture-pause", kind: "visual",
      source: stage4VisualSource("stage-4-beat-pause.webp"),
    },
    "stage-4-clap-together": {
      id: "stage-4-clap-together", kind: "visual",
      source: stage4VisualSource("stage-4-clap-together.webp"),
    },
    "stage-4-clap-out-of-sync": {
      id: "stage-4-clap-out-of-sync", kind: "visual",
      source: stage4VisualSource("stage-4-clap-out-of-sync.webp"),
    },
    "stage-5-dune-background": {
      id: "stage-5-dune-background", kind: "visual",
      source: stage5VisualSource("assets/stage-5-dune-background.webp"),
    },
    "stage-5-dune-puzzle": {
      id: "stage-5-dune-puzzle", kind: "visual",
      source: stage5VisualSource("assets/stage-5-dune-puzzle.webp"),
    },
    "stage-5-sand-sample-01": { id: "stage-5-sand-sample-01", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-01-black-volcanic.webp") },
    "stage-5-sand-sample-02": { id: "stage-5-sand-sample-02", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-02-white-coral.webp") },
    "stage-5-sand-sample-03": { id: "stage-5-sand-sample-03", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-03-pink-biogenic.webp") },
    "stage-5-sand-sample-04": { id: "stage-5-sand-sample-04", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-04-green-olivine.webp") },
    "stage-5-sand-sample-05": { id: "stage-5-sand-sample-05", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-05-river.webp") },
    "stage-5-sand-sample-06": { id: "stage-5-sand-sample-06", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-06-desert-quartz.webp") },
    "stage-5-sand-sample-07": { id: "stage-5-sand-sample-07", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-07-red-desert.webp") },
    "stage-5-sand-sample-08": { id: "stage-5-sand-sample-08", kind: "visual", source: stage5VisualSource("samples/stage-5-sand-sample-08-booming-dune.webp") },
    "stage-6-sound-cat": { id: "stage-6-sound-cat", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.cat) },
    "stage-6-sound-bell": { id: "stage-6-sound-bell", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.bell) },
    "stage-6-sound-train": { id: "stage-6-sound-train", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.train) },
    "stage-6-sound-chicken": { id: "stage-6-sound-chicken", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.chicken) },
    "stage-6-sound-door": { id: "stage-6-sound-door", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.door) },
    "stage-6-sound-mosquito": { id: "stage-6-sound-mosquito", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.mosquito) },
    "stage-6-sound-balloon": { id: "stage-6-sound-balloon", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.balloon) },
    "stage-6-sound-dog": { id: "stage-6-sound-dog", kind: "audio", source: stage6AudioSource(STAGE_6_AUDIO_FILES.dog) },
  },
} satisfies SoundCase001AssetManifest;
