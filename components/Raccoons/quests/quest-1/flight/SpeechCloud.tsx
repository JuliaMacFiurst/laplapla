"use client";

import React from "react";

export default function SpeechCloud({
  speaker,
  children,
}: {
  speaker: "pilot" | "copilot";
  children: React.ReactNode;
}) {
  const bgColor = speaker === "pilot" ? "#d0e8ff" : "#ffe9a8";

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "18px",
        background: bgColor,
        border: "2px solid #00000020",
        maxWidth: "600px",
        margin: "0 auto",
        fontSize: "18px",
        lineHeight: "1.3",
      }}
    >
      {children}
    </div>
  );
}
