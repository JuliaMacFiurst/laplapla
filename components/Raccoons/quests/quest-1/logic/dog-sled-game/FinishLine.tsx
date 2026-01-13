"use client";

interface FinishLineProps {
  finishX: number;
  scrollX: number;
  stageWidth: number;
}

export default function FinishLine({
  finishX,
  scrollX,
  stageWidth,
}: FinishLineProps) {
  const left = finishX - scrollX;

  if (stageWidth <= 0) return null;

  return (
    <div
      className="dog-sled-finish-line"
      style={{ left, top: 0 }}
      aria-hidden="true"
    >
      <div className="dog-sled-finish-pole left" />
      <div className="dog-sled-finish-banner">
        <span>ФИНИШ</span>
      </div>
      <div className="dog-sled-finish-pole right" />
    </div>
  );
}
