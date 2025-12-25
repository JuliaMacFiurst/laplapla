"use client";

import React from "react";

export type StatType = "stability" | "stamina" | "speed" | "risk";

export type StatLevel = "is-danger" | "is-warning" | "is-ok" | "is-max";

export interface StatBarProps {
  values: Record<StatType, number>; // 0..1
  levels: Record<StatType, StatLevel>;
}

export default function StatBar({ values, levels }: StatBarProps) {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  return (
    <div className="stat-panel-inner">
      <div className="stat-panel-fills">
        {(["stability", "stamina", "speed", "risk"] as const).map((key) => {
          const level = levels[key];
          const v = clamp(values[key]);

          return (
            <div
              key={key}
              className={`stat-panel-fill stat-panel-fill-${key} ${level}`}
              style={{ "--value": v } as React.CSSProperties}
            >
              <div className="stat-panel-fill-gradient" />
            </div>
          );
        })}
      </div>

      <img
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/stats-panel.webp"
        alt="Stats"
        className="stat-panel-frame"
        draggable={false}
      />
    </div>
  );
}