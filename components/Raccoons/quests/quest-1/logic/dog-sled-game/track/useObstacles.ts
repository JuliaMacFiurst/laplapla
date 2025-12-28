"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { OBSTACLES } from "./obstacles";
import { ObstacleInstance, TrackLane } from "./trackTypes";
import { ObstacleType, ObstacleDefinition } from "./obstacleTypes";

interface SpawnedObstacle extends ObstacleInstance {
  definition: ObstacleDefinition;
  yOffset?: number; // процент от высоты сцены, например 0.03
}

function createObstacle(
  type: ObstacleType,
  lane: TrackLane,
  x: number
): SpawnedObstacle {
  const definition = OBSTACLES[type];
  if (!definition) {
    throw new Error(`Obstacle definition for type "${type}" not found`);
  }
  return {
    id: `obs-${type}-${x}`,
    type,
    lane,
    x,
    definition,
  };
}

/**
 * useObstacles
 * -------------
 * Generates obstacle instances in world coordinates.
 * For now this is static; later it can become procedural.
 */
export function useObstacles(worldX: number, stageWidth: number): SpawnedObstacle[] {
  const [spawned, setSpawned] = useState<SpawnedObstacle[]>([]);
  const nextSpawnX = useRef(0);
  const shuffledBag = useRef<ObstacleType[]>([]);

  const SPAWN_STEP = 900;
  const LANES: TrackLane[] = ["upper", "lower"];
  const BAG: ObstacleType[] = ["tree", "trees", "log", "ice", "stakes", "snowdrift"];

  // Helper to shuffle an array
  function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  useEffect(() => {
    // Initialize the bag if empty
    if (shuffledBag.current.length === 0) {
      shuffledBag.current = shuffleArray(BAG);
    }

    let newObstacles = [...spawned];
    let laneIndex = newObstacles.length % 2; // alternate lanes based on count

    while (nextSpawnX.current < worldX + stageWidth * 2) {
      if (shuffledBag.current.length === 0) {
        shuffledBag.current = shuffleArray(BAG);
      }
      const type = shuffledBag.current.pop()!;
      const lane = LANES[laneIndex % 2];
      const obstacle = createObstacle(type, lane, nextSpawnX.current);
      newObstacles.push(obstacle);

      laneIndex++;
      nextSpawnX.current += SPAWN_STEP + Math.floor(Math.random() * 301);
    }

    // Filter out obstacles behind the view
    newObstacles = newObstacles.filter(o => o.x >= worldX - stageWidth);

    setSpawned(newObstacles);
  }, [worldX, stageWidth]);

  return spawned;
}