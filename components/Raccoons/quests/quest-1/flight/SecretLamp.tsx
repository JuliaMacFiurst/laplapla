"use client";

import React from "react";

export default function SecretLamp({ active }: { active: boolean }) {
  return (
    <div
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        backgroundColor: active ? "#4caf50" : "#d93636",
        border: "2px solid #00000030",
        margin: "0 6px",
        transition: "background-color 0.3s ease",
      }}
    />
  );
}
