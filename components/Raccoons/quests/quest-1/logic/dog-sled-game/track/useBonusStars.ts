"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLaneY, TrackLane } from "./trackTypes";

export const BONUS_STAR_EMOJI = "⭐️";

export interface BonusStar {
  id: string;
  lane: TrackLane;
  x: number;
  y: number;
  // Visual hint for simple rendering (emoji instead of SVG)
  emoji?: string;
}

interface BlockedSegment {
  fromX: number;
  toX: number;
  blocksLane: TrackLane;
}

const LANES: TrackLane[] = ["upper", "lower"];
const BASE_STAR_SPACING = 700;
const RANDOM_SPACING_VARIANCE = 220;
const STAR_VERTICAL_OFFSET = 60;

export function useBonusStars(
  spawnAnchorX: number,
  stageWidth: number,
  stageHeight: number,
  densityMultiplier: number = 1,
  blockedSegments: BlockedSegment[] = []
): [BonusStar[], (id: string) => void] {
  const blockedKey = useMemo(
    () =>
      blockedSegments
        .map((segment) => `${segment.fromX}:${segment.toX}:${segment.blocksLane}`)
        .join("|"),
    [blockedSegments]
  );

  const stableBlockedSegments = useMemo(
    () =>
      blockedSegments.map((segment) => ({
        fromX: segment.fromX,
        toX: segment.toX,
        blocksLane: segment.blocksLane,
      })),
    [blockedKey]
  );

  const [stars, setStars] = useState<BonusStar[]>([]);
  const nextStarXRef = useRef(0);
  const laneSequenceRef = useRef(0);

  useEffect(() => {
    setStars((prev) => {
      const targetX = spawnAnchorX + stageWidth * 2;
      if (stageWidth <= 0) return prev;

      if (nextStarXRef.current === 0) {
        nextStarXRef.current = spawnAnchorX + stageWidth;
      }

      if (nextStarXRef.current >= targetX) {
        return prev;
      }

      let updated = [...prev];
      let added = false;
      let attempts = 0;

      while (
        nextStarXRef.current < targetX &&
        attempts < 100
      ) {
        const lane =
          LANES[laneSequenceRef.current % LANES.length];
        laneSequenceRef.current += 1;

        const spacingStep =
          BASE_STAR_SPACING / Math.max(0.5, densityMultiplier) +
          Math.floor(Math.random() * RANDOM_SPACING_VARIANCE);

        const startX = nextStarXRef.current;

        const conflicts = stableBlockedSegments.some((segment) => {
          const overlapsX =
            startX >= segment.fromX - 20 &&
            startX <= segment.toX + 20;
          return overlapsX && segment.blocksLane === lane;
        });

        nextStarXRef.current += spacingStep;

        if (conflicts) {
          attempts += 1;
          continue;
        }

        const laneY = getLaneY(stageHeight, lane);
        const starY = Math.max(40, laneY - STAR_VERTICAL_OFFSET);
        const starId = `star-${startX}-${laneSequenceRef.current}`;

        updated.push({
          id: starId,
          lane,
          x: startX,
          y: starY,
          emoji: BONUS_STAR_EMOJI,
        });

        added = true;
        attempts += 1;
      }

      if (!added) return prev;
      return updated;
    });
  }, [
    spawnAnchorX,
    stageWidth,
    stageHeight,
    densityMultiplier,
    blockedKey,
    stableBlockedSegments,
  ]);

  const collectStar = useCallback((id: string) => {
    setStars((prev) => prev.filter((star) => star.id !== id));
  }, []);

  return [stars, collectStar];
}
