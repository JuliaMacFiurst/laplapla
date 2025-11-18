"use client";

import React from "react";
import SecretLamp from "./SecretLamp";

interface InstrumentPanelProps {
  secrets: { id: string; speaker: string; text: string }[];
  unlocked: string[];
}

export default function InstrumentPanel({ secrets, unlocked }: InstrumentPanelProps) {
  const width = 350;
  const height = 110;
  const lampRadius = 12;

  const lampSpacing = width / (secrets.length + 1);

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", margin: "0 auto" }}
    >
      {/* Основная форма панели (дуга) */}
      <path
        d={`
          M 10 20
          Q ${width / 2} 0 ${width - 10} 20
          L ${width - 10} ${height - 20}
          Q ${width / 2} ${height} 10 ${height - 20}
          Z
        `}
        fill="#4a5568"
        stroke="#2d3748"
        strokeWidth="3"
      />

      {/* Лампочки */}
      {secrets.map((secret, index) => {
        const cx = lampSpacing * (index + 1);
        const cy = height - 45;

        const isActive = unlocked.includes(secret.id);

        return (
          <g key={secret.id}>
            <circle
              cx={cx}
              cy={cy}
              r={lampRadius}
              fill={isActive ? "#4caf50" : "#d93636"}
              stroke="#1a1a1a"
              strokeWidth="2"
            />
          </g>
        );
      })}
    </svg>
  );
}