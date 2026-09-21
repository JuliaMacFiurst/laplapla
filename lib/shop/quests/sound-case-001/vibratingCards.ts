import type { Lang } from "@/i18n";
import type { SoundCase001Stage2VibrationCardAssetId } from "./assets";
import { SOUND_CARD_DUPLEX_MODE } from "./soundCards";

export const STAGE_2_SOURCE_WIDTH_PX = 1669;
export const STAGE_2_SOURCE_HEIGHT_PX = 942;
export const STAGE_2_VIBRATING_CARD_SIZE_MM = {
  width: 67,
  height: Number((67 * STAGE_2_SOURCE_HEIGHT_PX / STAGE_2_SOURCE_WIDTH_PX).toFixed(2)),
} as const;
export const STAGE_2_INTRO_CARD_SIZE_MM = { width: 60, height: 80 } as const;
export const STAGE_2_CLUE_CARD_SIZE_MM = { width: 60, height: 80 } as const;
export const STAGE_2_A4_SIZE_MM = { width: 210, height: 297 } as const;
export const STAGE_2_FRONT_PACKING_MM = {
  cardColumnsX: [5, 75],
  cardFirstY: 16,
  cardRowPitch: 41,
  clueX: 145,
  clueY: 16,
} as const;

export type VibratingCardDefinition = {
  id: string;
  order: number;
  illustrationAssetId: SoundCase001Stage2VibrationCardAssetId;
};

export const SOUND_CASE_001_STAGE_2_CARDS = {
  ru: [
    { id: "vibration-ru-01", order: 1, illustrationAssetId: "stage-2-vibration-card-ru-01-vi" },
    { id: "vibration-ru-02", order: 2, illustrationAssetId: "stage-2-vibration-card-ru-02-b" },
    { id: "vibration-ru-03", order: 3, illustrationAssetId: "stage-2-vibration-card-ru-03-ra" },
    { id: "vibration-ru-04", order: 4, illustrationAssetId: "stage-2-vibration-card-ru-04-tsi" },
    { id: "vibration-ru-05", order: 5, illustrationAssetId: "stage-2-vibration-card-ru-05-ya" },
    { id: "vibration-ru-06", order: 6, illustrationAssetId: "stage-2-vibration-card-ru-06-pe" },
    { id: "vibration-ru-07", order: 7, illustrationAssetId: "stage-2-vibration-card-ru-07-s" },
    { id: "vibration-ru-08", order: 8, illustrationAssetId: "stage-2-vibration-card-ru-08-ka" },
  ],
  en: [
    { id: "vibration-en-vi", order: 1, illustrationAssetId: "stage-2-vibration-card-en-vi" },
    { id: "vibration-en-b", order: 2, illustrationAssetId: "stage-2-vibration-card-en-b" },
    { id: "vibration-en-ra", order: 3, illustrationAssetId: "stage-2-vibration-card-en-ra" },
    { id: "vibration-en-ti", order: 4, illustrationAssetId: "stage-2-vibration-card-en-ti" },
    { id: "vibration-en-on", order: 5, illustrationAssetId: "stage-2-vibration-card-en-on" },
    { id: "vibration-en-n", order: 6, illustrationAssetId: "stage-2-vibration-card-en-n" },
    { id: "vibration-en-s", order: 7, illustrationAssetId: "stage-2-vibration-card-en-s" },
    { id: "vibration-en-a", order: 8, illustrationAssetId: "stage-2-vibration-card-en-a" },
    { id: "vibration-en-d", order: 9, illustrationAssetId: "stage-2-vibration-card-en-d" },
  ],
  he: [
    { id: "vibration-he-01", order: 1, illustrationAssetId: "stage-2-vibration-card-he-01-t" },
    { id: "vibration-he-02", order: 2, illustrationAssetId: "stage-2-vibration-card-he-02-nu" },
    { id: "vibration-he-03", order: 3, illustrationAssetId: "stage-2-vibration-card-he-03-d" },
    { id: "vibration-he-04", order: 4, illustrationAssetId: "stage-2-vibration-card-he-04-ot" },
    { id: "vibration-he-05", order: 5, illustrationAssetId: "stage-2-vibration-card-he-05-ba" },
    { id: "vibration-he-06", order: 6, illustrationAssetId: "stage-2-vibration-card-he-06-h" },
    { id: "vibration-he-07", order: 7, illustrationAssetId: "stage-2-vibration-card-he-07-o" },
    { id: "vibration-he-08", order: 8, illustrationAssetId: "stage-2-vibration-card-he-08-l" },
  ],
} as const satisfies Record<Lang, readonly VibratingCardDefinition[]>;

export const SOUND_CASE_001_STAGE_2_PHRASES = {
  ru: "ВИБРАЦИЯ ПЕСКА",
  en: "VIBRATION OF SAND",
  he: "תנודות בחול",
} as const satisfies Record<Lang, string>;

export const STAGE_2_CLUE_QR_DESTINATION =
  "https://www.laplapla.com/quests/sound-case-001/stage-02/clue" as const;
export const STAGE_2_CLUE_QR_ASSET_PATH =
  "/quests/sound-case-001/stage-02/clue-2-qr.svg" as const;

const CLUE_FRONT_POSITION_MM = {
  x: STAGE_2_FRONT_PACKING_MM.clueX,
  y: STAGE_2_FRONT_PACKING_MM.clueY,
} as const;
const CLUE_BACK_POSITION_MM = {
  x: STAGE_2_A4_SIZE_MM.width - CLUE_FRONT_POSITION_MM.x - STAGE_2_CLUE_CARD_SIZE_MM.width,
  y: CLUE_FRONT_POSITION_MM.y,
} as const;

export const SOUND_CASE_001_STAGE_2_INTRO_CARD = {
  id: "stage-2-intro-card",
  role: "stage-2-intro",
  parrotAssetId: "stage-2-parrot",
} as const;

export const SOUND_CASE_001_STAGE_2_CLUE_CARD = {
  id: "stage-2-clue-card",
  frontRole: "stage-2-clue-front",
  backRole: "stage-2-clue-back",
  frontPositionMm: CLUE_FRONT_POSITION_MM,
  backPositionMm: CLUE_BACK_POSITION_MM,
  duplexMode: SOUND_CARD_DUPLEX_MODE,
  qrDestination: STAGE_2_CLUE_QR_DESTINATION,
  qrAssetPath: STAGE_2_CLUE_QR_ASSET_PATH,
} as const;

export function getStage2FrontCards(locale: Lang) {
  return SOUND_CASE_001_STAGE_2_CARDS[locale];
}

export function getStage2VibratingCardPositionMm(index: number) {
  return {
    x: STAGE_2_FRONT_PACKING_MM.cardColumnsX[index % 2],
    y: STAGE_2_FRONT_PACKING_MM.cardFirstY + Math.floor(index / 2) * STAGE_2_FRONT_PACKING_MM.cardRowPitch,
  };
}

export const SOUND_CASE_001_STAGE_2_BOX_DIELINE_ID =
  "stage-2-vibrating-card-box" as const;

const MAX_CARD_COUNT = 11;
const CONSERVATIVE_300_GSM_CALIPER_MM = 0.4;
const ESTIMATED_STACK_DEPTH_MM = Number(
  (MAX_CARD_COUNT * CONSERVATIVE_300_GSM_CALIPER_MM).toFixed(2),
);
const WIDTH_CLEARANCE_MM = 6;
const HEIGHT_CLEARANCE_MM = 6;
const INTERNAL_DEPTH_MM = 8;
const DEPTH_CLEARANCE_MM = Number(
  (INTERNAL_DEPTH_MM - ESTIMATED_STACK_DEPTH_MM).toFixed(2),
);
const LARGEST_OBJECT_WIDTH_MM = Math.max(STAGE_2_VIBRATING_CARD_SIZE_MM.width, STAGE_2_INTRO_CARD_SIZE_MM.width, STAGE_2_CLUE_CARD_SIZE_MM.width);
const LARGEST_OBJECT_HEIGHT_MM = Math.max(STAGE_2_VIBRATING_CARD_SIZE_MM.height, STAGE_2_INTRO_CARD_SIZE_MM.height, STAGE_2_CLUE_CARD_SIZE_MM.height);
const INTERNAL_WIDTH_MM = LARGEST_OBJECT_WIDTH_MM + WIDTH_CLEARANCE_MM;
const INTERNAL_HEIGHT_MM = LARGEST_OBJECT_HEIGHT_MM + HEIGHT_CLEARANCE_MM;
const GLUE_FLAP_WIDTH_MM = 10;
const TOP_FLAP_EXTENT_MM = 32;
const BOTTOM_FLAP_EXTENT_MM = 28;

export const SOUND_CASE_001_STAGE_2_BOX = {
  maxCardCount: MAX_CARD_COUNT,
  largestObjectSizeMm: { width: LARGEST_OBJECT_WIDTH_MM, height: LARGEST_OBJECT_HEIGHT_MM },
  cardstockModel: {
    recommendedGsm: [200, 300],
    conservativeCaliperMm: CONSERVATIVE_300_GSM_CALIPER_MM,
    estimatedStackDepthMm: ESTIMATED_STACK_DEPTH_MM,
  },
  clearanceMm: {
    x: WIDTH_CLEARANCE_MM,
    y: HEIGHT_CLEARANCE_MM,
    z: DEPTH_CLEARANCE_MM,
  },
  internalSizeMm: {
    width: INTERNAL_WIDTH_MM,
    height: INTERNAL_HEIGHT_MM,
    depth: INTERNAL_DEPTH_MM,
  },
  glueFlapWidthMm: GLUE_FLAP_WIDTH_MM,
  topFlapExtentMm: TOP_FLAP_EXTENT_MM,
  bottomFlapExtentMm: BOTTOM_FLAP_EXTENT_MM,
  dielineSizeMm: {
    width: GLUE_FLAP_WIDTH_MM + INTERNAL_DEPTH_MM * 2 + INTERNAL_WIDTH_MM * 2,
    height: TOP_FLAP_EXTENT_MM + INTERNAL_HEIGHT_MM + BOTTOM_FLAP_EXTENT_MM,
  },
  svgPath: "/quests/sound-case-001/stage-02/stage-2-card-box-dieline.svg",
} as const;
