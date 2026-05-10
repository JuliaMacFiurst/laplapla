"use client";

import Image from "next/image";
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
        <Image
          src={`${BASE_URL}/${lane.item.id}.webp`}
          alt={lane.item.label}
          width={52}
          height={52}
          unoptimized
          className={`lab-game-thing ${statusClass}`}
          style={inlineStyle}
        />
      )}
    </div>
  );
}
