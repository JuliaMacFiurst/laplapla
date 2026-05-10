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
import { ObstacleInstance, TrackLane, getLaneY } from "./trackTypes";
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

const TRACK_LANES: TrackLane[] = ["upper", "lower"];
const OBSTACLE_BAG: ObstacleType[] = ["tree", "trees", "log", "ice", "stakes", "snowdrift"];
const BASE_SPAWN_STEP = 900;

function createObstacle(type: ObstacleType, lane: TrackLane, x: number): SpawnedObstacle {
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
  spawnAnchorX: number,
  stageWidth: number,
  stageHeight: number,
  obstacleRateMultiplier: number = 1,
  blockedSegments: BlockedSegment[] = []
): SpawnedObstacle[] {
  const stableBlockedSegments = useMemo(() => {
    return blockedSegments.map((seg) => ({
      fromX: seg.fromX,
      toX: seg.toX,
      blocksLane: seg.blocksLane,
    }));
  }, [blockedSegments]);

  const [spawned, setSpawned] = useState<SpawnedObstacle[]>([]);
  const nextSpawnX = useRef(0);
  const shuffledBag = useRef<ObstacleType[]>([]);

  function shuffleArray<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ⚠️ ВАЖНО: obstacles существуют в world-пространстве и не удаляются при уходе за экран
  useEffect(() => {
    // 🔑 FIX: гарантируем, что спавн начинается впереди камеры
    if (nextSpawnX.current === 0) {
      nextSpawnX.current = spawnAnchorX + stageWidth;
    }

    if (shuffledBag.current.length === 0) {
      shuffledBag.current = shuffleArray(OBSTACLE_BAG);
    }

    let newObstacles = [...spawned];
    let laneIndex = newObstacles.length % 2;

    while (nextSpawnX.current < spawnAnchorX + stageWidth * 2) {
      if (shuffledBag.current.length === 0) {
        shuffledBag.current = shuffleArray(OBSTACLE_BAG);
      }

      const type = shuffledBag.current.pop()!;
      const lane = TRACK_LANES[laneIndex % 2];

      const definition = OBSTACLES[type];
      const hitRadius = definition?.hitRadius ?? 0;

      const obsStartX = nextSpawnX.current - hitRadius;
      const obsEndX = nextSpawnX.current + hitRadius;

      const conflicts = stableBlockedSegments.some((seg) => {
        const overlapsX = obsEndX >= seg.fromX && obsStartX <= seg.toX;
        const blocksPassage = seg.blocksLane !== lane;
        return overlapsX && blocksPassage;
      });

      if (!conflicts) {
        newObstacles.push({
          ...createObstacle(type, lane, nextSpawnX.current),
          y: getLaneY(stageHeight, lane),
        });
        laneIndex++;
      }

      const spawnStep =
        BASE_SPAWN_STEP / Math.max(0.5, obstacleRateMultiplier);
      nextSpawnX.current +=
        spawnStep + Math.floor(Math.random() * 301);
    }

    // Removed filtering obstacles based on worldX and stageWidth to keep all spawned obstacles until marked passed

    setSpawned((prev) => {
      if (prev.length === newObstacles.length) return prev;
      return newObstacles;
    });
  }, [spawnAnchorX, spawned, stageWidth, stageHeight, obstacleRateMultiplier, stableBlockedSegments]);

  return spawned;
}
