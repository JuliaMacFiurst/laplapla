export interface LabThing {
  id: string;
  label: string;
  score: number;
  loganComment: string;
}

export type FallingThingStatus = "falling" | "caught" | "missed";

export interface LaneState {
  laneIndex: number;
  item: LabThing | null;
  y: number;
  speed: number;
  status?: FallingThingStatus;
}

export interface ScoreEntry {
  id: string;
  label: string;
  score: number;
}

export const FALLING_LANE_COUNT = 3;
export const FALLING_START_Y = -90;
export const FALLING_SPEED_MIN = 3;
export const FALLING_SPEED_MAX = 4;
export const FALLING_CATCH_LINE = 450;
export const FALLING_REMOVAL_LINE = 520;
export const MOBILE_FALLING_ITEM_MAX_HEIGHT = 104;

export function projectMobileFallingY(logicalY: number, laneHeight: number) {
  const scale = Math.min(
    1,
    Math.max(0, laneHeight - MOBILE_FALLING_ITEM_MAX_HEIGHT) / FALLING_REMOVAL_LINE,
  );
  return logicalY * scale;
}
export const BASE_URL =
  "/supabase-storage/quests/1_quest/games/lab-game/lab-things";
export const BACKPACK_IMAGE_URL =
  "/supabase-storage/quests/1_quest/games/lab-game/backpack-pic.png";
export const BACKPACK_VIDEO_URL =
  "/supabase-storage/quests/1_quest/games/lab-game/backpack.webm";
export const LOGAN_VIDEO_URL =
  "/supabase-storage/quests/1_quest/games/lab-game/raccoon.webm";
