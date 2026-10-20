import type { CSSProperties, ReactNode } from "react";
import type { SoundCardSheetSlot } from "@/lib/shop/quests/sound-case-001/soundCards";

type SoundCardCutAreaProps = {
  children: ReactNode;
  slot?: SoundCardSheetSlot;
  frontSlot?: SoundCardSheetSlot;
  backSlot?: SoundCardSheetSlot;
  pairId?: string;
};

function getSlotStyle(slot: SoundCardSheetSlot): CSSProperties {
  const zeroBasedSlot = slot - 1;

  return {
    gridColumn: (zeroBasedSlot % 3) + 1,
    gridRow: Math.floor(zeroBasedSlot / 3) + 1,
  };
}

export function SoundCardCutArea({
  children,
  slot,
  frontSlot,
  backSlot,
  pairId,
}: SoundCardCutAreaProps) {
  return (
    <div
      className="quest-sound-card-cut-area"
      data-slot={slot}
      data-front-slot={frontSlot}
      data-back-slot={backSlot}
      data-pair-id={pairId}
      style={slot ? getSlotStyle(slot) : undefined}
    >
      <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--tl" aria-hidden="true" />
      <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--tr" aria-hidden="true" />
      <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--bl" aria-hidden="true" />
      <i className="quest-sound-card-cut-mark quest-sound-card-cut-mark--br" aria-hidden="true" />
      {children}
    </div>
  );
}
