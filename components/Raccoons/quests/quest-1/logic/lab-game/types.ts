export interface LabThing {
  id: string;
  label: string;
  score: number;
  loganComment: string;
}

export interface LaneState {
  laneIndex: number;
  item: LabThing | null;
  y: number;
  speed: number;
}

export interface ScoreEntry {
  id: string;
  label: string;
  score: number;
}

export const FALLING_LANE_COUNT = 3;
export const FALLING_START_Y = -90;
export const FALLING_SPEED_MIN = 0.5;
export const FALLING_SPEED_MAX = 0.7;
export const FALLING_CATCH_LINE = 500;
export const FALLING_REMOVAL_LINE = 800;
export const BASE_URL =
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/lab-game/lab-things";
export const BACKPACK_IMAGE_URL =
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/lab-game/backpack-pic.png";
export const BACKPACK_VIDEO_URL =
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/lab-game/backpack.webm";
export const LOGAN_VIDEO_URL =
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/lab-game/raccoon.webm";
