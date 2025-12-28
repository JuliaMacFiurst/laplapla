export type ObstacleType =
  | "tree"
  | "trees"
  | "log"
  | "ice"
  | "snowdrift"
  | "stakes";

export type SpecialObstacleType =
  | "snowdrift_big";

export interface ObstacleDefinition {
  type: ObstacleType | SpecialObstacleType;
  src: string;
  hitRadius: number;
  severity: number; // насколько сильно влияет
}