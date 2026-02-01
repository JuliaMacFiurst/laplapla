"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoItem } from "../../content/videos";

type LanguageKey = "en" | "ru" | "he";

type VideoPlayerProps = {
  items: VideoItem[];
  startIndex: number;
  lang: LanguageKey;
  onClose: () => void;
  variant?: "short" | "video";
};

export function VideoPlayer({
  items,
  startIndex,
  onClose,
  variant = "video",
}: VideoPlayerProps) {
  const playableItems = useMemo(
    () => items.filter((item) => Boolean(item.youtubeId)),
    [items]
  );

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(playableItems.length - 1, startIndex))
  );

  useEffect(() => {
    setCurrentIndex(
      Math.max(0, Math.min(playableItems.length - 1, startIndex))
    );
  }, [startIndex, playableItems.length]);

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => Math.min(playableItems.length - 1, i + 1));
  };

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 40;

  const onSwipeStart = (x: number, y: number) => {
    swipeStart.current = { x, y };
  };

  const onSwipeEnd = (x: number, y: number) => {
    if (!swipeStart.current) return;

    const dx = x - swipeStart.current.x;
    const dy = y - swipeStart.current.y;
    swipeStart.current = null;

    if (variant === "short") {
      if (dy > SWIPE_THRESHOLD) handlePrev();
      else if (dy < -SWIPE_THRESHOLD) handleNext();
    } else {
      if (dx > SWIPE_THRESHOLD) handlePrev();
      else if (dx < -SWIPE_THRESHOLD) handleNext();
    }
  };

  return (
    <div className="video-player-overlay" onClick={onClose}>
      {playableItems.length > 1 && (
        <>
          <button
            className="video-player-arrow prev"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous video"
          >
            ‹
          </button>

          <button
            className="video-player-arrow next"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next video"
          >
            ›
          </button>
        </>
      )}

      <div
        className={`video-player-window ${variant}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => onSwipeStart(e.clientX, e.clientY)}
        onMouseUp={(e) => onSwipeEnd(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) onSwipeStart(t.clientX, t.clientY);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (t) onSwipeEnd(t.clientX, t.clientY);
        }}
      >
        <button className="video-player-close" onClick={onClose}>
          ✕
        </button>

        <div className={`video-player-content ${variant}`}>
          {(() => {
            const item = playableItems[currentIndex];
            if (!item || !item.youtubeId) return null;

            const youtubeId = item.youtubeId;

            return (
              <div
                key={youtubeId}
                className="video-player-slide"
                style={{ scrollSnapAlign: "start" }}
              >
                <iframe
                  key={youtubeId}
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1&rel=0&loop=1&playlist=${youtubeId}`}
                  title={`Embedded video ${currentIndex + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
