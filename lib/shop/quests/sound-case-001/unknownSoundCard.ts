import type { SoundCase001VisualAssetId } from "./assets";
import {
  SOUND_CARD_DUPLEX_MODE,
  getLongEdgeBackSlot,
  type SoundCardDuplexMode,
  type SoundCardSheetSlot,
} from "./soundCards";

export type UnknownSoundCardDefinition = {
  id: "unknown-sound-card";
  frontRole: "unknown-sound-front";
  backRole: "unknown-sound-back";
  frontSlot: SoundCardSheetSlot;
  backSlot: SoundCardSheetSlot;
  duplexMode: SoundCardDuplexMode;
  parrotAssetId: SoundCase001VisualAssetId;
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
} satisfies UnknownSoundCardDefinition;
