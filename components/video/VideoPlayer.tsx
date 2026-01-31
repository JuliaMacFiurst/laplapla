"use client";

import { useEffect, useRef, useState } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    setCurrentIndex(startIndex);
  }, [startIndex]);

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
    setCurrentIndex((i) => Math.min(items.length - 1, i + 1));
  };

  return (
    <div className="video-player-overlay" onClick={onClose}>
      {items.length > 1 && (
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
        >
          {items.map((item, index) => {
            const youtubeId = item.youtubeId;

            if (!youtubeId) {
              return null;
            }

            return (
              <div
                key={item.id}
                className="video-player-slide"
                style={{ scrollSnapAlign: "start" }}
              >
                {index === currentIndex && (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=1`}
                    title="Embedded video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
