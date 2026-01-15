"use client";

import { BACKPACK_IMAGE_URL, BACKPACK_VIDEO_URL } from "./types";

interface BackpackProps {
  active: boolean;
}

export default function Backpack({ active }: BackpackProps) {
  return (
    <div className="lab-game-backpack">
      {active ? (
        <video
          key="backpack-video"
          className="lab-game-backpack-video"
          src={BACKPACK_VIDEO_URL}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
        />
      ) : (
        <img
          key="backpack-still"
          src={BACKPACK_IMAGE_URL}
          alt="Рюкзак"
        />
      )}
    </div>
  );
}
