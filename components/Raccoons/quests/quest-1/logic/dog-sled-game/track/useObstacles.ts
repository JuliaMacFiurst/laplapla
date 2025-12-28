"use client";

import { useMemo } from "react";
import { OBSTACLES } from "./obstacles";
import { ObstacleInstance, TrackLane } from "./trackTypes";
import { ObstacleType, ObstacleDefinition } from "./obstacleTypes";

interface SpawnedObstacle extends ObstacleInstance {
  definition: ObstacleDefinition;
}

function createObstacle(
  type: ObstacleType,
  lane: TrackLane,
  x: number,
  y: number
): SpawnedObstacle {
  const definition = OBSTACLES[type];
  if (!definition) {
    throw new Error(`Obstacle definition for type "${type}" not found`);
  }
  return {
    id: `obs-${type}-${x}-${y}`,
    type,
    lane,
    x,
    y,
    definition,
  };
}

/**
 * useObstacles
 * -------------
 * Generates obstacle instances in world coordinates.
 * For now this is static; later it can become procedural.
 */
export function useObstacles(): SpawnedObstacle[] {
  return useMemo(() => {
    const obstacles: SpawnedObstacle[] = [
      createObstacle("tree", "upper", 1200, 280),
      createObstacle("trees", "upper", 1200, 280),
      createObstacle("log", "lower", 1800, 440),
      createObstacle("ice", "upper", 2500, 280),
      createObstacle("stakes", "upper", 3900, 280),
    ];

    return obstacles;
  }, []);
}