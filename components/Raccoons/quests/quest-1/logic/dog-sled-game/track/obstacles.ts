import { ObstacleDefinition, ObstacleType, SpecialObstacleType } from "./obstacleTypes";

export const OBSTACLES: Partial<Record<ObstacleType, ObstacleDefinition>> = {
  tree: {
    type: "tree",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/tree.webp",
    hitRadius: 40,
    severity: 0.7,
  },
  trees: {
    type: "trees",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/trees.webp",
    hitRadius: 60,
    severity: 0.6,
  },
  log: {
    type: "log",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/log.webp",
    hitRadius: 60,
    severity: 0.5,
  },
  ice: {
    type: "ice",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/ice.webp",
    hitRadius: 50,
    severity: 0.4,
  },
  snowdrift: {
    type: "snowdrift",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/snowdrift.webp",
    hitRadius: 50,
    severity: 0.3,
  },
  stakes: {
    type: "stakes",
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/stakes.webp",
    hitRadius: 60,
    severity: 0.8,
  },
};

export const SNOWDRIFT_VARIANTS = {
  upper: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/snowdrift_upper.webp",
  lower: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/riding-zone/snowdrift_lower.webp",
} as const;

export type SnowdriftLane = keyof typeof SNOWDRIFT_VARIANTS;

export function createBigSnowdrift(lane: SnowdriftLane): ObstacleDefinition {
  return {
    type: "snowdrift_big",
    src: SNOWDRIFT_VARIANTS[lane],
    hitRadius: 90,
    severity: 0.5,
  };
}
