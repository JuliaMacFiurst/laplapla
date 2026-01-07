import { ObstacleType } from "./obstacleTypes";

export type TrackLane = "upper" | "lower";

export const TRACK_LANE_Y_RATIO: Record<TrackLane, number> = {
  upper: 0.66,
  lower: 0.8,
};

export function getLaneY(
  stageHeight: number,
  lane: TrackLane
): number {
  return stageHeight * TRACK_LANE_Y_RATIO[lane];
}

export interface ObstacleInstance {
  id: string;

  // логика
  type: ObstacleType;

  // визуальный вариант (опционально)
  variant?: "upper" | "lower";

  // позиционирование
  x: number;          // мировые координаты (не screen!)
  y?: number
  lane: TrackLane;    // upper | lower

  // состояние
  passed?: boolean;   // чтобы не считать коллизию дважды
}