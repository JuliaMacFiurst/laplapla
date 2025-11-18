"use client";

import React from "react";
import SpeechCloud from "./SpeechCloud";

export interface DialogueStep {
  id: string;
  speaker: "roland" | "logan";
  text: string;
}

export default function DialogBox({
  queue,
  onNext,
}: {
  queue: DialogueStep[];
  onNext: () => void;
}) {
  if (queue.length === 0) return null;

  const current = queue[0];

  const cloudSpeaker: "pilot" | "copilot" =
    current.speaker === "roland" ? "pilot" : "copilot";

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <SpeechCloud speaker={cloudSpeaker}>
        {current.text}
      </SpeechCloud>

      <button
        onClick={onNext}
        style={{
          marginTop: "12px",
          padding: "8px 14px",
          fontSize: "16px",
          borderRadius: "8px",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          cursor: "pointer",
        }}
      >
        Далее
      </button>
    </div>
  );
}