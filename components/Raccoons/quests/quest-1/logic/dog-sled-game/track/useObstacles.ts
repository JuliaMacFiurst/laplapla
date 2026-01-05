"use client";

/**
 * useObstacles
 * =================
 *
 * Ответственность этого хука:
 * - спавнить препятствия в world‑координатах
 * - гарантировать, что уже заспавненные obstacles НИКОГДА
 *   не исчезают по геймдизайнерским причинам
 * - уважать логические ограничения дороги (сужения, обочины),
 *   получая их В ЯВНОМ ВИДЕ как blockedSegments
 *
 * ❗️Важно:
 * - здесь НЕТ таймеров
 * - здесь НЕТ знаний о визуале
 * - здесь НЕТ знаний о Snowdrift как картинке
 *
 * Единственная точка принятия решений — МОМЕНТ СПАВНА.
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { OBSTACLES } from "./obstacles";
import { ObstacleInstance, TrackLane } from "./trackTypes";
import { ObstacleType, ObstacleDefinition } from "./obstacleTypes";

interface BlockedSegment {
  fromX: number;
  toX: number;
  blocksLane: TrackLane;
}

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
export function useObstacles(
  worldX: number,
  stageWidth: number,
  blockedSegments: BlockedSegment[] = []
): SpawnedObstacle[] {
  const blockedKey = useMemo(() => {
    return blockedSegments
      .map(seg => `${seg.fromX}:${seg.toX}:${seg.blocksLane}`)
      .join("|");
  }, [blockedSegments]);

  const stableBlockedSegments = useMemo(() => {
    return blockedSegments.map(seg => ({
      fromX: seg.fromX,
      toX: seg.toX,
      blocksLane: seg.blocksLane,
    }));
  }, [blockedKey]);

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
      let lane = LANES[laneIndex % 2];

      const definition = OBSTACLES[type];
      const hitRadius = definition?.hitRadius ?? 0;

      const obsStartX = nextSpawnX.current - hitRadius;
      const obsEndX = nextSpawnX.current + hitRadius;

      // Проверяем: не убьёт ли этот obstacle проходимость
      const conflicts = stableBlockedSegments.some((seg) => {
        const overlapsX =
          obsEndX >= seg.fromX && obsStartX <= seg.toX;

        const blocksPassage = seg.blocksLane !== lane;

        return overlapsX && blocksPassage;
      });

      if (!conflicts) {
        const obstacle = createObstacle(type, lane, nextSpawnX.current);
        newObstacles.push(obstacle);
        laneIndex++;
      }

      nextSpawnX.current += SPAWN_STEP + Math.floor(Math.random() * 301);
    }

    // Filter out obstacles behind the view
    newObstacles = newObstacles.filter(o => o.x >= worldX - stageWidth);

    setSpawned((prev) => {
      if (prev.length === newObstacles.length) return prev;
      return newObstacles;
    });
  }, [worldX, stageWidth, stableBlockedSegments]);

  return spawned;
}