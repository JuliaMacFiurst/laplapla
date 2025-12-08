"use client";



export default function SpeechCloud({
  speaker,
  children,
}: {
  speaker: "pilot" | "copilot";
  children: React.ReactNode;
}) {
  const bgColor = speaker === "pilot" ? "#ffe9a8" : "#a7e1fe";

  return (
    <div className="quest-speech-cloud-wrapper">
      <div
        className="quest-speech-cloud"
        style={{ background: bgColor }}
      >
        {children}
      </div>

      {/* Tail */}
      <div
        className={
          speaker === "pilot"
            ? "quest-speech-cloud-tail tail--pilot"
            : "quest-speech-cloud-tail tail--copilot"
        }
        style={{ background: bgColor }}
      />
    </div>
  );
}
