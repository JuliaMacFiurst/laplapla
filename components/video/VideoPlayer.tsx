"use client";

import { useRef } from "react";

type VideoPlayerProps = {
  youtubeId: string;
  onClose: () => void;
  variant?: "short" | "video";
};

export function VideoPlayer({
  youtubeId,
  onClose,
  variant = "video",
}: VideoPlayerProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // threshold to ignore micro-movements
    const THRESHOLD = 50;

    if (variant === "short" && absY > absX && absY > THRESHOLD) {
      if (deltaY < 0) {
        console.log("SHORT: swipe up → next");
      } else {
        console.log("SHORT: swipe down → prev");
      }
    }

    if (variant === "video" && absX > absY && absX > THRESHOLD) {
      if (deltaX < 0) {
        console.log("VIDEO: swipe left → next");
      } else {
        console.log("VIDEO: swipe right → prev");
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="video-player-overlay"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`video-player-window ${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="video-player-close" onClick={onClose}>
          ✕
        </button>

        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=1`}
          title="Embedded video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
