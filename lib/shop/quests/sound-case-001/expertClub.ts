export const STAGE_7_PUBLIC_PATH = "/quests/sound-case-001/stage-07/expert-club" as const;
export const STAGE_7_DESTINATION = `https://www.laplapla.com${STAGE_7_PUBLIC_PATH}` as const;
export const STAGE_7_HOST_QR_ASSET_PATH = "/quests/sound-case-001/stage-07/expert-club-qr.svg" as const;

/** The finale route is deliberately not invented in Stage 07. */
export const SOUND_CASE_001_FINALE_DESTINATION: null = null;
export const SAMPLE_08_FINAL_QR_RESPONSIBILITY = "sound-case-001-finale" as const;

export const STAGE_7_CARD_SIZE_MM = { width: 57, height: 58 } as const;
export const STAGE_7_LABEL_SIZE_MM = { width: 44, height: 20 } as const;
export const STAGE_7_DISCUSSION_SECONDS = 60 as const;
export const STAGE_7_PRINTED_PIECE_COUNT = 17 as const;
export const STAGE_7_ASSUMED_CARDSTOCK_THICKNESS_MM = 0.4 as const;
export const STAGE_7_STACK_THICKNESS_MM = STAGE_7_PRINTED_PIECE_COUNT * STAGE_7_ASSUMED_CARDSTOCK_THICKNESS_MM;
export const STAGE_7_BOX_INNER_SIZE_MM = { width: 59, height: 60, depth: 9 } as const;
export const STAGE_7_BOX_GLUE_FLAP_MM = 10 as const;
export const STAGE_7_BOX_TOP_FLAP_MM = 28 as const;
export const STAGE_7_BOX_BOTTOM_FLAP_MM = 24 as const;
export const STAGE_7_BOX_DIELINE_SIZE_MM = {
  width: STAGE_7_BOX_GLUE_FLAP_MM + STAGE_7_BOX_INNER_SIZE_MM.depth * 2 + STAGE_7_BOX_INNER_SIZE_MM.width * 2,
  height: STAGE_7_BOX_TOP_FLAP_MM + STAGE_7_BOX_INNER_SIZE_MM.height + STAGE_7_BOX_BOTTOM_FLAP_MM,
} as const;
export const STAGE_7_BOX_DIELINE_POSITION_MM = { x: 32, y: 82 } as const;

export type Stage7EquipmentId =
  | "microphones"
  | "radar"
  | "geophones"
  | "sand-samples"
  | "camera"
  | "human-butt"
  | "metal-detector";

export type Stage7EquipmentAssetId = `stage-7-equipment-${Stage7EquipmentId}`;

export const STAGE_7_EQUIPMENT = [
  { id: "microphones", assetId: "stage-7-equipment-microphones", researchStatus: "verified" },
  { id: "radar", assetId: "stage-7-equipment-radar", researchStatus: "verified" },
  { id: "geophones", assetId: "stage-7-equipment-geophones", researchStatus: "verified" },
  { id: "sand-samples", assetId: "stage-7-equipment-sand-samples", researchStatus: "verified" },
  { id: "camera", assetId: "stage-7-equipment-camera", researchStatus: "context" },
  { id: "human-butt", assetId: "stage-7-equipment-human-butt", researchStatus: "verified" },
  { id: "metal-detector", assetId: "stage-7-equipment-metal-detector", researchStatus: "not-documented-method" },
] as const satisfies readonly {
  id: Stage7EquipmentId;
  assetId: Stage7EquipmentAssetId;
  researchStatus: "verified" | "context" | "not-documented-method";
}[];

/** The inserted metal detector is not part of the documented research methods. */
export const STAGE_7_ROUND_1_ANSWER: Stage7EquipmentId = "metal-detector";

export const STAGE_7_BACKGROUND_REQUIREMENT = {
  assetId: "stage-7-expert-club-background",
  aspectRatio: "16:10 landscape; keep a mobile-safe center crop",
  minimumSize: "2400 × 1500 px WebP",
  prompt: "Original Parrot Sound Lab Expert Club room in the established LapLapLa adventure illustration style: a theatrical laboratory club, warm dramatic practical lighting, a central shared game table, LapLapLa heroes seated around it, Parrot as host, scientific instruments and playful mysterious details. Keep the central phone UI zone and upper header zone calm and dark with strong negative space. No text, logos, quiz-show symbols, roulette/table motifs, television-studio imitation, or copyrighted branding. Compose for 16:10 desktop with all essential characters surviving a centered 390 × 844 mobile crop.",
} as const;

export const STAGE_7_SCIENCE_SOURCES = {
  fieldMethods: "https://doi.org/10.1029/2007GL030276",
  radarAndSliding: "https://lindecenter.caltech.edu/news/science-seat-pants-880",
  burpingAndBooming: "https://authors.library.caltech.edu/records/b3tan-cab83",
  dissertation: "https://doi.org/10.7907/BFHE-0969",
} as const;

export const getStage7CardPositionMm = (index: number) => ({
  x: 13 + (index % 3) * 63,
  y: 18 + Math.floor(index / 3) * 64,
});

export const getStage7LabelPositionMm = (index: number) => ({
  x: 11 + (index % 4) * 47,
  y: 214 + Math.floor(index / 4) * 24,
});
