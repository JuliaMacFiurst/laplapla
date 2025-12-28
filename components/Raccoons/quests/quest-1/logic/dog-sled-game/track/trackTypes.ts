import { ObstacleType } from "./obstacleTypes";

export type TrackLane = "upper" | "lower";

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