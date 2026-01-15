"use client";

import {
  BACKPACK_IMAGE_URL,
  BACKPACK_VIDEO_URL,
  FALLING_LANE_COUNT,
} from "./types";

interface BackpackProps {
  active: boolean;
  laneIndex: number;
}

export default function Backpack({ active, laneIndex }: BackpackProps) {
  const clampedLane = Math.max(0, Math.min(laneIndex, FALLING_LANE_COUNT - 1));
  const laneWidth = 100 / FALLING_LANE_COUNT;
  const leftPercent = laneWidth * clampedLane + laneWidth / 2;

  return (
    <div className="lab-game-backpack" style={{ left: `${leftPercent}%` }}>
      {active ? (
        <video
          key="backpack-video"
          className="lab-game-backpack-video"
          src={BACKPACK_VIDEO_URL}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
        />
      ) : (
        <img key="backpack-still" src={BACKPACK_IMAGE_URL} alt="Рюкзак" />
      )}
    </div>
  );
}
