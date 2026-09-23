import type { SoundCase001Stage5VisualAssetId } from "./assets";

export const STAGE_5_CARD_SIZE_MM = { width: 57, height: 76 } as const;
export const STAGE_5_PUZZLE_GRID = { columns: 4, rows: 2 } as const;
export const STAGE_5_DUPLEX_MODE = "flip-long-edge" as const;
export const STAGE_5_SAND_ARTICLE_SLUG = "sand-is-not-just-sand" as const;
export const STAGE_5_SAND_ARTICLE_DESTINATION = `https://www.laplapla.com/bedtime-stories/${STAGE_5_SAND_ARTICLE_SLUG}` as const;
export const STAGE_6_PUBLIC_PATH = "/quests/sound-case-001/stage-06/sound-code" as const;
export const STAGE_6_DESTINATION = `https://www.laplapla.com${STAGE_6_PUBLIC_PATH}` as const;
export const STAGE_5_QR_ASSET_PATHS = {
  article: "/quests/sound-case-001/stage-05/sand-article-qr.svg",
  soundCode: "/quests/sound-case-001/stage-05/sound-code-qr.svg",
} as const;

export const STAGE_5_BOX_CARD_COUNT = 8 as const;
export const STAGE_5_BOX_ASSUMED_CARDSTOCK_THICKNESS_MM = 0.4 as const;
export const STAGE_5_BOX_STACK_THICKNESS_MM = STAGE_5_BOX_CARD_COUNT * STAGE_5_BOX_ASSUMED_CARDSTOCK_THICKNESS_MM;
export const STAGE_5_BOX_INNER_SIZE_MM = { width: 59, height: 78, depth: 6 } as const;
export const STAGE_5_BOX_GLUE_FLAP_MM = 10 as const;
export const STAGE_5_BOX_TOP_FLAP_MM = 30 as const;
export const STAGE_5_BOX_BOTTOM_FLAP_MM = 26 as const;
export const STAGE_5_BOX_DIELINE_SIZE_MM = {
  width: STAGE_5_BOX_GLUE_FLAP_MM + STAGE_5_BOX_INNER_SIZE_MM.depth * 2 + STAGE_5_BOX_INNER_SIZE_MM.width * 2,
  height: STAGE_5_BOX_TOP_FLAP_MM + STAGE_5_BOX_INNER_SIZE_MM.height + STAGE_5_BOX_BOTTOM_FLAP_MM,
} as const;
export const STAGE_5_BOX_DIELINE_POSITION_MM = { x: 35, y: 81.5 } as const;

export type SandSampleId = `sample-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
export type SandSampleDefinition = {
  id: SandSampleId;
  index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  kind: "black-volcanic" | "white-coral" | "pink-biogenic" | "green-olivine" | "river" | "desert-quartz" | "red-desert" | "booming-dune";
  assetId: SoundCase001Stage5VisualAssetId;
  isLiwa: boolean;
  qrDestination: string;
  qrAssetPath: string;
};

export const SOUND_CASE_001_STAGE_5_SAMPLES = ([
  "black-volcanic", "white-coral", "pink-biogenic", "green-olivine",
  "river", "desert-quartz", "red-desert", "booming-dune",
] as const).map((kind, offset) => {
  const index = (offset + 1) as SandSampleDefinition["index"];
  const isLiwa = index === 8;
  return {
    id: `sample-0${index}` as SandSampleId,
    index,
    kind,
    assetId: `stage-5-sand-sample-0${index}` as SoundCase001Stage5VisualAssetId,
    isLiwa,
    qrDestination: isLiwa ? STAGE_6_DESTINATION : STAGE_5_SAND_ARTICLE_DESTINATION,
    qrAssetPath: isLiwa ? STAGE_5_QR_ASSET_PATHS.soundCode : STAGE_5_QR_ASSET_PATHS.article,
  };
}) satisfies readonly SandSampleDefinition[];

export const STAGE_6_COORDINATE_PUZZLE = {
  latitude: { prefix: "22.", missingDigits: [9, 7, 5, 0, 8, 9] as const, suffix: "° N" },
  longitude: { prefix: "53.", missingDigits: [7, 8, 5, 4, 3, 1] as const, suffix: "° E" },
  final: { latitude: "22.975089° N", longitude: "53.785431° E", clipboard: "22.975089, 53.785431" },
} as const;

export function getStage5CardPositionMm(index: number) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return { x: 15 + column * 63, y: 25 + row * 82 };
}

export function getStage5BackPositionMm(index: number) {
  const front = getStage5CardPositionMm(index);
  return { x: 210 - front.x - STAGE_5_CARD_SIZE_MM.width, y: front.y };
}

export function getStage5PuzzleTile(index: number) {
  return { index: index + 1, column: index % 4, row: Math.floor(index / 4) };
}
