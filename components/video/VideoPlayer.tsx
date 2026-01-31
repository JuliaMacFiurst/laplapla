"use client";

import { useEffect, useRef } from "react";
import type { AnyVideo } from "../../content/videos";

type LanguageKey = "en" | "ru" | "he";

type VideoPlayerProps = {
  items: AnyVideo[];
  startIndex: number;
  lang: LanguageKey;
  onClose: () => void;
  variant?: "short" | "video";
};

export function VideoPlayer({
  items,
  startIndex,
  lang,
  onClose,
  variant = "video",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const child = el.children[startIndex] as HTMLElement | undefined;
    if (!child) return;

    child.scrollIntoView({
      behavior: "auto",
      block: "start",
      inline: "start",
    });
  }, [startIndex]);

  const scrollToIndex = (index: number) => {
    const el = containerRef.current;
    if (!el) return;

    const child = el.children[index] as HTMLElement | undefined;
    if (!child) return;

    child.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  };

  const handlePrev = () => {
    if (startIndex <= 0) return;
    scrollToIndex(startIndex - 1);
  };

  const handleNext = () => {
    if (startIndex >= items.length - 1) return;
    scrollToIndex(startIndex + 1);
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
          {items.map((item) => {
            const youtubeId =
              item.youtubeIds[lang] || item.youtubeIds.en;

            return (
              <div
                key={item.id}
                className="video-player-slide"
                style={{ scrollSnapAlign: "start" }}
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=1`}
                  title="Embedded video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
