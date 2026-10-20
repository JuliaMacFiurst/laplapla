import type { SoundCase001VisualAssetId } from "./assets";
import {
  SOUND_CARD_DUPLEX_MODE,
  getLongEdgeBackSlot,
  type SoundCardDuplexMode,
  type SoundCardSheetSlot,
} from "./soundCards";

export type IntroCardDefinition = {
  id: "stage-1-intro-card";
  frontRole: "stage-1-intro-front";
  backRole: "stage-1-intro-back";
  frontSlot: SoundCardSheetSlot;
  backSlot: SoundCardSheetSlot;
  duplexMode: SoundCardDuplexMode;
  parrotAssetId: SoundCase001VisualAssetId;
};

const INTRO_CARD_FRONT_SLOT = 5 satisfies SoundCardSheetSlot;

export const SOUND_CASE_001_INTRO_CARD = {
  id: "stage-1-intro-card",
  frontRole: "stage-1-intro-front",
  backRole: "stage-1-intro-back",
  frontSlot: INTRO_CARD_FRONT_SLOT,
  backSlot: getLongEdgeBackSlot(INTRO_CARD_FRONT_SLOT),
  duplexMode: SOUND_CARD_DUPLEX_MODE,
  parrotAssetId: "sound-lab-parrot",
} satisfies IntroCardDefinition;
