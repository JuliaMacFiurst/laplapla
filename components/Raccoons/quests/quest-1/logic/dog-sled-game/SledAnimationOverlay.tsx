"use client";

import type { SledAnimation } from "../../../../../../types/types";
import { buildSupabaseStorageUrl } from "@/lib/publicAssetUrls";

interface Props {
  animation: SledAnimation;
  onFinished: () => void;
}

const VIDEO_MAP: Record<Exclude<SledAnimation, null>, string> = {
  loads: buildSupabaseStorageUrl("quests/1_quest/games/dog-sled/dogs-video/loads.webm"),
  water: buildSupabaseStorageUrl("quests/1_quest/games/dog-sled/dogs-video/water.webm"),
  food: buildSupabaseStorageUrl("quests/1_quest/games/dog-sled/dogs-video/food.webm"),
  dogs: buildSupabaseStorageUrl("quests/1_quest/games/dog-sled/dogs-video/dogs.webm"),
  skids: buildSupabaseStorageUrl("quests/1_quest/games/dog-sled/dogs-video/skids.webm"),
};

export default function SledAnimationOverlay({ animation, onFinished }: Props) {
  if (animation === null) return null;

  return (
    <div className="sled-animation-overlay">
      <video
        src={VIDEO_MAP[animation]}
        autoPlay
        playsInline
        muted
        onEnded={onFinished}
        className="sled-animation-video"
      />
    </div>
  );
}
