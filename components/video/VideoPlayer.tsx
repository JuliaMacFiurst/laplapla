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
  // --- mobile / tablet detection (touch-first devices) ---
  const isTouchDevice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    );
  }, []);

  const mobileUnplayableIdsRef = useRef<Set<string>>(new Set());

  const playableItems = useMemo(() => {
    const base = items.filter((item) => Boolean(item.youtubeId));
    if (!isTouchDevice) return base;
    return base.filter(
      (item) => !mobileUnplayableIdsRef.current.has(item.youtubeId!)
    );
  }, [items, isTouchDevice]);

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(playableItems.length - 1, startIndex))
  );

  useEffect(() => {
    setCurrentIndex(
      Math.max(0, Math.min(playableItems.length - 1, startIndex))
    );
  }, [startIndex, playableItems.length]);

  // --- autoplay failure detection ---
  const startTimeoutRef = useRef<number | null>(null);
  const autoSkipCountRef = useRef(0);
  const MAX_AUTO_SKIPS = 5;
  const START_TIMEOUT_MS = 3000;
  const userInteractedRef = useRef(false);
  const videoLoadedRef = useRef(false);

  const clearStartTimeout = () => {
    if (startTimeoutRef.current !== null) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    clearStartTimeout();
    userInteractedRef.current = false;
    videoLoadedRef.current = false;

    if (!isTouchDevice) return;

    // reset skip counter if user manually navigates
    const dynamicTimeout =
      autoSkipCountRef.current > 2 ? 800 : START_TIMEOUT_MS;

    startTimeoutRef.current = window.setTimeout(() => {
      if (userInteractedRef.current || videoLoadedRef.current) {
        clearStartTimeout();
        return;
      }
      autoSkipCountRef.current += 1;

      if (autoSkipCountRef.current >= MAX_AUTO_SKIPS) {
        clearStartTimeout();
        onClose();
        return;
      }

      markCurrentAsUnplayableAndAdvance();
    }, dynamicTimeout);

    return () => {
      clearStartTimeout();
    };
  }, [currentIndex, isTouchDevice]);

  const markCurrentAsUnplayableAndAdvance = () => {
    const item = playableItems[currentIndex];
    if (!item?.youtubeId) return;

    mobileUnplayableIdsRef.current.add(item.youtubeId);

    setCurrentIndex((i) => {
      const next = Math.min(
        playableItems.length - 2,
        Math.max(0, i)
      );
      return next;
    });
  };

  const handlePrev = () => {
    autoSkipCountRef.current = 0;
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    autoSkipCountRef.current = 0;
    setCurrentIndex((i) => {
      let next = i + 1;
      while (
        next < playableItems.length &&
        isTouchDevice &&
        mobileUnplayableIdsRef.current.has(
          playableItems[next].youtubeId!
        )
      ) {
        next++;
      }
      return Math.min(playableItems.length - 1, next);
    });
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
        onMouseDown={(e) => {
          userInteractedRef.current = true;
          clearStartTimeout();
          onSwipeStart(e.clientX, e.clientY);
        }}
        onMouseUp={(e) => onSwipeEnd(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          userInteractedRef.current = true;
          clearStartTimeout();
          const t = e.touches[0];
          if (t) onSwipeStart(t.clientX, t.clientY);
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          if (t) onSwipeEnd(t.clientX, t.clientY);
        }}
      >
        <button
          className="video-player-close"
          onClick={() => {
            clearStartTimeout();
            onClose();
          }}
        >
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
                  onLoad={() => {
                    videoLoadedRef.current = true;
                    autoSkipCountRef.current = 0;
                    clearStartTimeout();
                  }}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
