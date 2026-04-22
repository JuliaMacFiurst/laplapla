"use client";

import { useEffect, useRef } from "react";
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (animation === null) return;

    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      onFinished();
    };

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      void video.play().catch(() => {
        window.setTimeout(finish, 300);
      });
    }

    const fallbackTimer = window.setTimeout(finish, 5200);

    return () => {
      closed = true;
      window.clearTimeout(fallbackTimer);
      if (video) {
        video.pause();
      }
    };
  }, [animation, onFinished]);

  if (animation === null) return null;

  return (
    <div className="sled-animation-overlay">
      <video
        ref={videoRef}
        key={animation}
        src={VIDEO_MAP[animation]}
        autoPlay
        playsInline
        muted
        preload="auto"
        onEnded={onFinished}
        onError={onFinished}
        onLoadedData={(event) => {
          void event.currentTarget.play().catch(() => {});
        }}
        className="sled-animation-video"
      />
    </div>
  );
}
