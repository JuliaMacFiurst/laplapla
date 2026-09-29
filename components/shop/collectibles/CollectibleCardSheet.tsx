import type { CSSProperties, ReactNode } from "react";
import type { SoundCardSheetSlot } from "@/lib/shop/quests/sound-case-001/soundCards";

export type CollectibleCardPlacement = {
  key: string;
  slot: SoundCardSheetSlot;
  frontSlot: SoundCardSheetSlot;
  backSlot: SoundCardSheetSlot;
  content: ReactNode;
};

function slotStyle(slot: SoundCardSheetSlot): CSSProperties {
  const index = slot - 1;
  return { gridColumn: index % 3 + 1, gridRow: Math.floor(index / 3) + 1 };
}

export function CollectibleCardSheet({
  children,
  placements,
  guide,
  side,
  sheetNumber,
  sheetCount,
}: {
  children?: ReactNode;
  placements: readonly CollectibleCardPlacement[];
  guide: string;
  side: "front" | "back";
  sheetNumber: number;
  sheetCount: number;
}) {
  return (
    <section className={`collectible-card-sheet collectible-card-sheet--${side}`} data-collectible-sheet={side}>
      <header className="collectible-card-sheet__guide" dir="ltr">
        <bdi>{guide}</bdi><span>·</span><bdi>{`SHEET ${sheetNumber}/${sheetCount}`}</bdi><span>·</span><bdi>63 × 88 mm</bdi>
      </header>
      <div className="collectible-card-sheet__grid">
        {placements.map((placement) => (
          <div
            className="collectible-card-cut-area"
            key={placement.key}
            style={slotStyle(placement.slot)}
            data-slot={placement.slot}
            data-front-slot={placement.frontSlot}
            data-back-slot={placement.backSlot}
          >
            <i className="collectible-card-cut-mark collectible-card-cut-mark--tl" aria-hidden="true" />
            <i className="collectible-card-cut-mark collectible-card-cut-mark--tr" aria-hidden="true" />
            <i className="collectible-card-cut-mark collectible-card-cut-mark--bl" aria-hidden="true" />
            <i className="collectible-card-cut-mark collectible-card-cut-mark--br" aria-hidden="true" />
            {placement.content}
          </div>
        ))}
      </div>
      {children}
    </section>
  );
}
