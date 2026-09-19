import type { SoundCase001VisualAssetId } from "./assets";
import {
  SOUND_CARD_DUPLEX_MODE,
  getLongEdgeBackSlot,
  type SoundCardDuplexMode,
  type SoundCardSheetSlot,
} from "./soundCards";

export const UNKNOWN_SOUND_QR_DESTINATION =
  "https://www.laplapla.com/quests/sound-case-001/stage-01/unknown-sound" as const;

export const UNKNOWN_SOUND_QR_ASSET_PATH =
  "/quests/sound-case-001/stage-01/unknown-sound-qr.svg" as const;

export type UnknownSoundCardDefinition = {
  id: "unknown-sound-card";
  frontRole: "unknown-sound-front";
  backRole: "unknown-sound-back";
  frontSlot: SoundCardSheetSlot;
  backSlot: SoundCardSheetSlot;
  duplexMode: SoundCardDuplexMode;
  parrotAssetId: SoundCase001VisualAssetId;
  qrDestination: typeof UNKNOWN_SOUND_QR_DESTINATION;
  qrAssetPath: typeof UNKNOWN_SOUND_QR_ASSET_PATH;
};

const UNKNOWN_SOUND_FRONT_SLOT = 4 satisfies SoundCardSheetSlot;

export const SOUND_CASE_001_UNKNOWN_SOUND_CARD = {
  id: "unknown-sound-card",
  frontRole: "unknown-sound-front",
  backRole: "unknown-sound-back",
  frontSlot: UNKNOWN_SOUND_FRONT_SLOT,
  backSlot: getLongEdgeBackSlot(UNKNOWN_SOUND_FRONT_SLOT),
  duplexMode: SOUND_CARD_DUPLEX_MODE,
  parrotAssetId: "sound-lab-parrot",
  qrDestination: UNKNOWN_SOUND_QR_DESTINATION,
  qrAssetPath: UNKNOWN_SOUND_QR_ASSET_PATH,
} satisfies UnknownSoundCardDefinition;
