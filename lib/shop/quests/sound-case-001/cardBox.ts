export const SOUND_CASE_001_CARD_BOX_DIELINE_ID =
  "stage-1-sound-card-box" as const;

const CARD_COUNT = 14;
const CONSERVATIVE_300_GSM_CALIPER_MM = 0.4;
const ESTIMATED_STACK_DEPTH_MM = Number(
  (CARD_COUNT * CONSERVATIVE_300_GSM_CALIPER_MM).toFixed(2),
);
const INTERNAL_DEPTH_MM = 9;
const DEPTH_CLEARANCE_MM = Number(
  (INTERNAL_DEPTH_MM - ESTIMATED_STACK_DEPTH_MM).toFixed(2),
);

/**
 * Physical contract for the Stage 01 card tuck box.
 *
 * The 62 x 82 mm card cavity adds 1 mm clearance around a 60 x 80 mm
 * card. For the upper end of the recommended home-print range, a deliberately
 * conservative 0.40 mm caliper gives a 5.60 mm stack for fourteen cards.
 * The existing 9 mm cavity therefore retains 3.40 mm for paper variation,
 * ink, imperfect scoring/folds, and comfortable removal without becoming an
 * unnecessarily loose box.
 */
export const SOUND_CASE_001_CARD_BOX = {
  cardCount: CARD_COUNT,
  cardstockModel: {
    recommendedGsm: [200, 300],
    conservativeCaliperMm: CONSERVATIVE_300_GSM_CALIPER_MM,
    estimatedStackDepthMm: ESTIMATED_STACK_DEPTH_MM,
    depthClearanceMm: DEPTH_CLEARANCE_MM,
  },
  internalSizeMm: {
    width: 62,
    height: 82,
    depth: INTERNAL_DEPTH_MM,
  },
  glueFlapWidthMm: 10,
  topFlapExtentMm: 32,
  bottomFlapExtentMm: 28,
  dielineSizeMm: {
    width: 152,
    height: 142,
  },
  svgPath:
    "/quests/sound-case-001/stage-01/stage-1-sound-card-box-dieline.svg",
} as const;

export type SoundCase001CardBoxDielineId =
  typeof SOUND_CASE_001_CARD_BOX_DIELINE_ID;
