"use client";

import React, { useState } from "react";
import { flightSecrets } from "@/utils/flightSecrets";
import SpeechCloud from "./SpeechCloud";
import InstrumentPanel from "./InstrumentPanel";
import SteeringHandle from "./SteeringYoke";
import GoToNextButton from "./GoToNextButton";

export default function FlightSecretsManager() {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [currentSecret, setCurrentSecret] = useState<number | null>(null);

  const handleActivate = (speaker: "pilot" | "copilot") => {
    const remaining = flightSecrets.filter(
      (s) => s.speaker === speaker && !unlocked.includes(s.id)
    );

    if (remaining.length === 0) return;

    const next = remaining[0];
    setUnlocked((prev) => [...prev, next.id]);
    setCurrentSecret(flightSecrets.indexOf(next));
  };

  const readyForTakeoff = unlocked.length === flightSecrets.length;

  const shownSecret =
    currentSecret !== null ? flightSecrets[currentSecret] : null;

  return (
    <div style={{ width: "100%", marginTop: "20px" }}>
      {shownSecret && (
        <SpeechCloud speaker={shownSecret!.speaker as "pilot" | "copilot"}>
          {shownSecret.text}
        </SpeechCloud>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "20px",
        }}
      >
        <SteeringHandle side="pilot" onActivate={() => handleActivate("pilot")} />
        <InstrumentPanel secrets={flightSecrets} unlocked={unlocked} />
        <SteeringHandle
          side="copilot"
          onActivate={() => handleActivate("copilot")}
        />
      </div>

      {readyForTakeoff && (
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <GoToNextButton />
        </div>
      )}
    </div>
  );
}