"use client";

import type { CSSProperties } from "react";
import type { LaneState } from "./types";
import { BASE_URL } from "./types";

export interface FallingThingLaneProps {
  lane: LaneState;
}

export default function FallingThingLane({ lane }: FallingThingLaneProps) {
  const statusClass = lane.status ? `lab-game-thing--${lane.status}` : "";

  const inlineStyle = {
    "--lane-y": `${lane.y}px`,
  } as CSSProperties;

  return (
    <div className="lab-game-lane">
      {lane.item && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${lane.laneIndex}-${lane.item.id}-${lane.status ?? "falling"}`}
          src={`${BASE_URL}/${lane.item.id}.webp`}
          alt={lane.item.label}
          className={`lab-game-thing ${statusClass}`}
          style={inlineStyle}
        />
      )}
    </div>
  );
}
