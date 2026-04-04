"use client";


import SpeechCloud from "./SpeechCloud";
import { useQuest1I18n } from "../i18n";

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
  const { t } = useQuest1I18n();
  if (queue.length === 0) return null;

  const current = queue[0];

  const cloudSpeaker: "pilot" | "copilot" =
    current.speaker === "roland" ? "copilot" : "pilot";

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <SpeechCloud speaker={cloudSpeaker}>
        {current.text}
      </SpeechCloud>

      <button
        onClick={onNext}
        className="dialog-next-btn"
      >
        {t.miniTest.next}
      </button>
    </div>
  );
}
