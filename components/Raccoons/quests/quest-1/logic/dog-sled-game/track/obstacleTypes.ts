export type ObstacleType =
  | "tree"
  | "trees"
  | "log"
  | "ice"
  | "snowdrift"
  | "stakes";

export interface ObstacleDefinition {
  type: ObstacleType;
  src: string;
  hitRadius: number;
  severity: number; // насколько сильно влияет
}