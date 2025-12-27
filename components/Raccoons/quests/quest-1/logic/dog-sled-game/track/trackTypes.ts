import { ObstacleType } from "./obstacleTypes";

export type TrackLane = "upper" | "lower";

export interface Obstacle {
  id: string;
  type: ObstacleType;
  segmentId: string;
  x: number; // позиция внутри сегмента (в пикселях)
  lane: TrackLane;
}

export type TrackSegmentType =
  | "straight"
  | "split"
  | "merge"
  | "curve-up"
  | "curve-down";

export interface TrackSegment {
  id: string;
  type: string;
  src: string;
  widthScreens: number; // ← ВАЖНО
  yUpper: number;
  yLower: number;
  obstacles?: Obstacle[];
}