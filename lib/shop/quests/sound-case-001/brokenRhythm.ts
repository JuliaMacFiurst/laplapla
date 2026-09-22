import type { Lang } from "@/i18n";

export type RhythmGesture = "clap" | "snap" | "knee-pat" | "pause";
export type BrokenRhythmLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type BrokenRhythmLevelId = `level-${"01" | "02" | "03" | "04" | "05" | "06"}`;

export type RhythmAnswer = {
  id: `answer-${BrokenRhythmLevelId}-${1 | 2 | 3}`;
  rhythm: readonly RhythmGesture[];
  correct: boolean;
  qrDestination?: string;
  qrAssetPath?: string;
};

export type BrokenRhythmLevelDefinition = {
  id: BrokenRhythmLevelId;
  level: BrokenRhythmLevel;
  color: string;
  secret: readonly RhythmGesture[];
  answers: readonly [RhythmAnswer, RhythmAnswer, RhythmAnswer];
};

export const STAGE_4_CARD_SIZE_MM = { width: 88, height: 56 } as const;
export const STAGE_4_CARD_GAP_MM = { x: 6, y: 6 } as const;
export const STAGE_4_SHEET_MARGIN_MM = { x: 14, y: 18 } as const;
export const STAGE_4_CARDS_PER_SHEET = 8 as const;
export const STAGE_4_DUPLEX_MODE = "flip-long-edge" as const;
export const STAGE_4_RULES_CARD_SIZE_MM = STAGE_4_CARD_SIZE_MM;

export const STAGE_4_MAX_CARD_COUNT = 25 as const;
export const STAGE_4_ASSUMED_CARDSTOCK_THICKNESS_MM = 0.4 as const;
export const STAGE_4_BOX_CLEARANCE_MM = { width: 5, height: 5, depth: 5 } as const;
export const STAGE_4_BOX_GLUE_TAB_MM = 12 as const;
export const STAGE_4_BOX_TUCK_FLAP_MM = 30 as const;
export const STAGE_4_BOX_CLOSURE_FLAP_MM = 15 as const;

export function calculateStage4BoxGeometry(cardstockThicknessMm: number = STAGE_4_ASSUMED_CARDSTOCK_THICKNESS_MM) {
  const stackThickness = STAGE_4_MAX_CARD_COUNT * cardstockThicknessMm;
  const inner = {
    width: STAGE_4_CARD_SIZE_MM.width + STAGE_4_BOX_CLEARANCE_MM.width,
    height: STAGE_4_CARD_SIZE_MM.height + STAGE_4_BOX_CLEARANCE_MM.height,
    depth: stackThickness + STAGE_4_BOX_CLEARANCE_MM.depth,
  };
  return {
    cardstockThickness: cardstockThicknessMm,
    stackThickness,
    inner,
    dieline: {
      width: STAGE_4_BOX_TUCK_FLAP_MM + inner.height + STAGE_4_BOX_CLOSURE_FLAP_MM,
      height: STAGE_4_BOX_GLUE_TAB_MM + inner.depth + inner.width + inner.depth + inner.width,
    },
  };
}

export const STAGE_4_BOX_GEOMETRY = calculateStage4BoxGeometry();
export const STAGE_4_ESTIMATED_STACK_THICKNESS_MM = STAGE_4_BOX_GEOMETRY.stackThickness;
export const STAGE_4_BOX_INNER_SIZE_MM = STAGE_4_BOX_GEOMETRY.inner;
export const STAGE_4_BOX_DIELINE_SIZE_MM = STAGE_4_BOX_GEOMETRY.dieline;
export const STAGE_4_BOX_DIELINE_POSITION_MM = { x: 6, y: 34.5 } as const;
export const STAGE_4_RULES_FRONT_POSITION_MM = { x: 116, y: 35 } as const;
export const STAGE_4_RULES_BACK_POSITION_MM = {
  x: 210 - STAGE_4_RULES_FRONT_POSITION_MM.x - STAGE_4_RULES_CARD_SIZE_MM.width,
  y: STAGE_4_RULES_FRONT_POSITION_MM.y,
} as const;

export const STAGE_4_QR_DESTINATIONS = {
  wrongA: "https://www.laplapla.com/quests/sound-case-001/stage-04/check/wrong-a",
  wrongB: "https://www.laplapla.com/quests/sound-case-001/stage-04/check/wrong-b",
  correct: "https://www.laplapla.com/quests/sound-case-001/stage-04/check/correct",
} as const;

export const STAGE_4_QR_ASSET_PATHS = {
  wrongA: "/quests/sound-case-001/stage-04/answer-wrong-a-qr.svg",
  wrongB: "/quests/sound-case-001/stage-04/answer-wrong-b-qr.svg",
  correct: "/quests/sound-case-001/stage-04/answer-correct-qr.svg",
} as const;

const answer = (
  level: BrokenRhythmLevel,
  index: 1 | 2 | 3,
  rhythm: readonly RhythmGesture[],
  correct: boolean,
  qr?: keyof typeof STAGE_4_QR_DESTINATIONS,
): RhythmAnswer => ({
  id: `answer-level-0${level}-${index}` as RhythmAnswer["id"],
  rhythm,
  correct,
  ...(qr ? {
    qrDestination: STAGE_4_QR_DESTINATIONS[qr],
    qrAssetPath: STAGE_4_QR_ASSET_PATHS[qr],
  } : {}),
});

export const SOUND_CASE_001_STAGE_4_LEVELS = [
  {
    id: "level-01", level: 1, color: "#e15b64",
    secret: ["clap", "clap", "snap"],
    answers: [
      answer(1, 1, ["clap", "snap", "clap"], false),
      answer(1, 2, ["clap", "clap", "snap"], true),
      answer(1, 3, ["clap", "clap", "knee-pat"], false),
    ],
  },
  {
    id: "level-02", level: 2, color: "#e38b32",
    secret: ["clap", "knee-pat", "clap", "snap"],
    answers: [
      answer(2, 1, ["clap", "clap", "knee-pat", "snap"], false),
      answer(2, 2, ["clap", "knee-pat", "snap", "clap"], false),
      answer(2, 3, ["clap", "knee-pat", "clap", "snap"], true),
    ],
  },
  {
    id: "level-03", level: 3, color: "#d2b538",
    secret: ["snap", "snap", "clap", "knee-pat", "clap", "snap", "snap"],
    answers: [
      answer(3, 1, ["snap", "snap", "clap", "knee-pat", "clap", "snap", "snap"], true),
      answer(3, 2, ["snap", "clap", "snap", "knee-pat", "clap", "snap", "snap"], false),
      answer(3, 3, ["snap", "snap", "clap", "clap", "knee-pat", "snap", "snap"], false),
    ],
  },
  {
    id: "level-04", level: 4, color: "#43a56b",
    secret: ["clap", "snap", "snap", "knee-pat", "clap", "clap"],
    answers: [
      answer(4, 1, ["clap", "snap", "knee-pat", "snap", "clap", "clap"], false),
      answer(4, 2, ["clap", "snap", "snap", "knee-pat", "clap", "clap"], true),
      answer(4, 3, ["clap", "snap", "snap", "clap", "knee-pat", "clap"], false),
    ],
  },
  {
    id: "level-05", level: 5, color: "#397db5",
    secret: ["snap", "clap", "snap", "knee-pat", "snap", "clap"],
    answers: [
      answer(5, 1, ["snap", "snap", "clap", "knee-pat", "snap", "clap"], false),
      answer(5, 2, ["snap", "clap", "knee-pat", "snap", "snap", "clap"], false),
      answer(5, 3, ["snap", "clap", "snap", "knee-pat", "snap", "clap"], true),
    ],
  },
  {
    id: "level-06", level: 6, color: "#8668b5",
    secret: ["clap", "clap", "snap", "pause", "knee-pat", "snap", "clap"],
    answers: [
      answer(6, 1, ["clap", "clap", "pause", "snap", "knee-pat", "snap", "clap"], false, "wrongA"),
      answer(6, 2, ["clap", "clap", "snap", "pause", "knee-pat", "snap", "clap"], true, "correct"),
      answer(6, 3, ["clap", "snap", "clap", "pause", "knee-pat", "snap", "clap"], false, "wrongB"),
    ],
  },
] as const satisfies readonly BrokenRhythmLevelDefinition[];

export type Stage4CardObject =
  | { id: `secret-${BrokenRhythmLevelId}`; kind: "secret"; level: BrokenRhythmLevelDefinition }
  | { id: RhythmAnswer["id"]; kind: "answer"; level: BrokenRhythmLevelDefinition; answer: RhythmAnswer };

export const STAGE_4_CARD_OBJECTS: readonly Stage4CardObject[] = SOUND_CASE_001_STAGE_4_LEVELS.flatMap((level) => [
  { id: `secret-${level.id}` as const, kind: "secret" as const, level },
  ...level.answers.map((answerCard) => ({ id: answerCard.id, kind: "answer" as const, level, answer: answerCard })),
]);

export function getStage4SheetCards(sheetNumber: 1 | 2 | 3) {
  return STAGE_4_CARD_OBJECTS.slice((sheetNumber - 1) * STAGE_4_CARDS_PER_SHEET, sheetNumber * STAGE_4_CARDS_PER_SHEET);
}

export function getStage4CardPositionMm(index: number) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  return {
    x: STAGE_4_SHEET_MARGIN_MM.x + column * (STAGE_4_CARD_SIZE_MM.width + STAGE_4_CARD_GAP_MM.x),
    y: STAGE_4_SHEET_MARGIN_MM.y + row * (STAGE_4_CARD_SIZE_MM.height + STAGE_4_CARD_GAP_MM.y),
  };
}

export function formatStage4Level(level: BrokenRhythmLevel) {
  return String(level).padStart(2, "0");
}

export function getStage4ResultKind(slug: string | string[] | undefined) {
  const value = Array.isArray(slug) ? slug[0] : slug;
  return value === "correct" ? "correct" : value === "wrong-a" || value === "wrong-b" ? "wrong" : null;
}

export function getStage4PersonalizedLead(leadName: string | undefined) {
  return leadName?.trim() || "";
}

export const STAGE_4_RESULT_PATH = "/quests/sound-case-001/stage-04/check/[result]";
export const STAGE_4_PRINT_LOCALES: readonly Lang[] = ["ru", "en", "he"];
