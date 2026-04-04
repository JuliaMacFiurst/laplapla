"use client";

import React from "react";
import { useQuest1I18n } from "../../i18n";

export type StatType = "stability" | "stamina" | "speed" | "risk";

export type StatLevel = "is-danger" | "is-warning" | "is-ok" | "is-max";

export interface StatBarProps {
  values: Record<StatType, number>; // 0..1
  levels: Record<StatType, StatLevel>;
}

export default function StatBar({ values, levels }: StatBarProps) {
  const { t } = useQuest1I18n();
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  return (
      <div className="stat-panel-inner">
        <div className="stat-bar-risk-labels">
          <div className="stat-bar-risk-low">{t.day5Garage.stats.lowRisk}</div>
          {levels.risk === "is-max" && (
            <div className="stat-bar-risk-high">{t.day5Garage.stats.highRisk}</div>
          )}
        </div>
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
        <div className="stat-bar-bottom-labels">
          <div className="stat-bar-label stat-bar-label-stability">{t.day5Garage.stats.stability}</div>
          <div className="stat-bar-label stat-bar-label-stamina">{t.day5Garage.stats.stamina}</div>
          <div className="stat-bar-label stat-bar-label-speed">{t.day5Garage.stats.speed}</div>
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
