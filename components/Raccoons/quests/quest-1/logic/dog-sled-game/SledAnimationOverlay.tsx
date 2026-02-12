"use client";

import type { SledAnimation } from "../../../../../../types/types";

interface Props {
  animation: SledAnimation;
  onFinished: () => void;
}

const VIDEO_MAP: Record<Exclude<SledAnimation, null>, string> = {
  loads: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/dogs-video/loads.webm",
  water: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/dogs-video/water.webm",
  food: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/dogs-video/food.webm",
  dogs: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/dogs-video/dogs.webm",
  skids: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/dog-sled/dogs-video/skids.webm",
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