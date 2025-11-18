"use client";

import React from "react";

interface SteeringHandleProps {
  side: "pilot" | "copilot";
  onActivate: () => void;
}

export default function SteeringHandle({ side, onActivate }: SteeringHandleProps) {
  return (
    <div
      onClick={onActivate}
      style={{
        width: "70px",
        height: "70px",
        borderRadius: "50%",
        backgroundColor: "#555",
        border: "3px solid #222",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "8px",
          backgroundColor: "#222",
          borderRadius: "4px",
        }}
      ></div>
    </div>
  );
}
