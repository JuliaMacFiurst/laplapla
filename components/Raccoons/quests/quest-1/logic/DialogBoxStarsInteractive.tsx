

"use client";


import SpeechCloud from "./SpeechCloud";

export interface StarDialogueStep {
  id: string;
  speaker: "logan" | "svensen";
  text: string;
}

export default function DialogBoxStarsInteractive({
  queue,
}: {
  queue: StarDialogueStep[];
}) {
  if (queue.length === 0) return null;

  const current = queue[0];

  const cloudSpeaker: "pilot" | "copilot" =
    current.speaker === "svensen" ? "copilot" : "pilot";

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <SpeechCloud speaker={cloudSpeaker}>
        {current.text}
      </SpeechCloud>
    </div>
  );
}