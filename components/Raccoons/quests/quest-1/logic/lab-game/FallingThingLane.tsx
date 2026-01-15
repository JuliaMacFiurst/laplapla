"use client";

import type { LaneState } from "./types";
import { BASE_URL } from "./types";

export interface FallingThingLaneProps {
  lane: LaneState;
}

export default function FallingThingLane({ lane }: FallingThingLaneProps) {
  return (
    <div className="lab-game-lane">
      {lane.item && (
        <img
          src={`${BASE_URL}/${lane.item.id}.webp`}
          alt={lane.item.label}
          className="lab-game-thing"
          style={{
            transform: `translate(-50%, ${lane.y}px)`,
          }}
        />
      )}
    </div>
  );
}
