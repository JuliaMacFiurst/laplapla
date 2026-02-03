"use client";

import { useRef } from "react";

import {
  BACKPACK_IMAGE_URL,
  BACKPACK_VIDEO_URL,
  FALLING_LANE_COUNT,
} from "./types";

interface BackpackProps {
  active: boolean;
  laneIndex: number;
  onLaneDrag?: (laneIndex: number) => void;
}

export default function Backpack({
  active,
  laneIndex,
  onLaneDrag,
}: BackpackProps) {
  const startXRef = useRef<number | null>(null);
  const startLaneRef = useRef<number>(laneIndex);
  const DRAG_THRESHOLD_PX = 12;

  const clampedLane = Math.max(0, Math.min(laneIndex, FALLING_LANE_COUNT - 1));
  const laneWidth = 100 / FALLING_LANE_COUNT;
  const leftPercent = laneWidth * clampedLane + laneWidth / 2;

  return (
    <div
      className="lab-game-backpack"
      style={{ left: `${leftPercent}%` }}
      onPointerDown={(e) => {
        startXRef.current = e.clientX;
        startLaneRef.current = clampedLane;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (startXRef.current == null) return;

        const dx = e.clientX - startXRef.current;
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;

        const laneWidthPx = e.currentTarget.parentElement?.getBoundingClientRect().width;
        if (!laneWidthPx) return;

        const deltaLanes = Math.round(
          dx / (laneWidthPx / FALLING_LANE_COUNT)
        );

        const nextLane = Math.max(
          0,
          Math.min(startLaneRef.current + deltaLanes, FALLING_LANE_COUNT - 1)
        );

        onLaneDrag?.(nextLane);
      }}
      onPointerUp={() => {
        startXRef.current = null;
      }}
      onPointerCancel={() => {
        startXRef.current = null;
      }}
    >
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
