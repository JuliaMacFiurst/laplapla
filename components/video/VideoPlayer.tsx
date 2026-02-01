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
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const child = el.children[currentIndex] as HTMLElement | undefined;
    if (!child) return;

    child.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => Math.min(playableItems.length - 1, i + 1));
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const size =
      variant === "short" ? el.clientHeight || 1 : el.clientWidth || 1;
    const offset = variant === "short" ? el.scrollTop : el.scrollLeft;
    const index = Math.round(offset / size);
    const clamped = Math.max(0, Math.min(playableItems.length - 1, index));

    if (clamped !== currentIndex) {
      setCurrentIndex(clamped);
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
              const prevIndex = (currentIndex - 1 + playableItems.length) % playableItems.length;
              console.log("prev", playableItems[prevIndex]?.youtubeId);
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
              const nextIndex = (currentIndex + 1) % playableItems.length;
              console.log("next", playableItems[nextIndex]?.youtubeId);
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
      >
        <button className="video-player-close" onClick={onClose}>
          ✕
        </button>

        <div
          className={`video-player-content ${variant}`}
          ref={containerRef}
          style={{
            scrollSnapType: variant === "short" ? "y mandatory" : "x mandatory",
          }}
          onScroll={handleScroll}
        >
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
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=1&autoplay=1`}
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
