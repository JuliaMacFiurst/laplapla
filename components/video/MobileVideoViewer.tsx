"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type VideoItem = {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
};

type Props = {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
  closeLabel?: string;
  hintLabel?: string;
};

const SWIPE_THRESHOLD = 50;

function clampIndex(index: number, max: number) {
  return Math.max(0, Math.min(index, max));
}

function wrapIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  return ((index % length) + length) % length;
}

function buildEmbedUrl(videoUrl: string, autoplay: boolean) {
  const separator = videoUrl.includes("?") ? "&" : "?";
  return `${videoUrl}${separator}autoplay=${autoplay ? 1 : 0}&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
}

function postYoutubeCommand(iframe: HTMLIFrameElement | null, func: "playVideo" | "pauseVideo") {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(
    JSON.stringify({
      event: "command",
      func,
      args: [],
    }),
    "*"
  );
}

export default function MobileVideoViewer({
  videos,
  initialIndex,
  onClose,
  closeLabel = "Close video",
  hintLabel,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialIndex, Math.max(0, videos.length - 1))
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(0);

  const startYRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  useEffect(() => {
    setCurrentIndex(clampIndex(initialIndex, Math.max(0, videos.length - 1)));
  }, [initialIndex, videos.length]);

  useEffect(() => {
    const syncViewportHeight = () => {
      setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
    };

    syncViewportHeight();
    window.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    return () => {
      window.removeEventListener("resize", syncViewportHeight);
      window.visualViewport?.removeEventListener("resize", syncViewportHeight);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const renderRange = useMemo(() => {
    if (videos.length === 0) {
      return [];
    }

    if (videos.length === 1) {
      return [
        {
          key: `${videos[0].id}-0`,
          video: videos[0],
          offset: 0,
        },
      ];
    }

    if (videos.length === 2) {
      const currentVideo = videos[currentIndex];
      const siblingVideo = videos[wrapIndex(currentIndex + 1, videos.length)];

      return [
        {
          key: `${siblingVideo.id}--1`,
          video: siblingVideo,
          offset: -1,
        },
        {
          key: `${currentVideo.id}-0`,
          video: currentVideo,
          offset: 0,
        },
        {
          key: `${siblingVideo.id}-1`,
          video: siblingVideo,
          offset: 1,
        },
      ];
    }

    return [
      {
        key: `${videos[wrapIndex(currentIndex - 1, videos.length)].id}--1`,
        video: videos[wrapIndex(currentIndex - 1, videos.length)],
        offset: -1,
      },
      {
        key: `${videos[currentIndex].id}-0`,
        video: videos[currentIndex],
        offset: 0,
      },
      {
        key: `${videos[wrapIndex(currentIndex + 1, videos.length)].id}-1`,
        video: videos[wrapIndex(currentIndex + 1, videos.length)],
        offset: 1,
      },
    ];
  }, [currentIndex, videos]);

  useEffect(() => {
    renderRange.forEach((entry) => {
      const iframe = iframeRefs.current[entry.key];

      if (entry.offset === 0 && isPlaying) {
        postYoutubeCommand(iframe, "playVideo");
      } else {
        postYoutubeCommand(iframe, "pauseVideo");
      }
    });
  }, [currentIndex, isPlaying, renderRange]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isAnimatingRef.current) {
      return;
    }

    startYRef.current = event.touches[0]?.clientY ?? 0;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    const nextOffset = (event.touches[0]?.clientY ?? 0) - startYRef.current;
    setDragOffset(nextOffset);
  };

  const finishGesture = () => {
    if (!isDragging || isAnimatingRef.current) {
      setDragOffset(0);
      setIsDragging(false);
      return;
    }

    let nextIndex = currentIndex;

    if (dragOffset < -SWIPE_THRESHOLD) {
      nextIndex = wrapIndex(currentIndex + 1, videos.length);
    } else if (dragOffset > SWIPE_THRESHOLD) {
      nextIndex = wrapIndex(currentIndex - 1, videos.length);
    }

    if (nextIndex !== currentIndex) {
      isAnimatingRef.current = true;
      setCurrentIndex(nextIndex);
      setIsPlaying(true);
      window.setTimeout(() => {
        isAnimatingRef.current = false;
      }, 360);
    }

    setDragOffset(0);
    setIsDragging(false);
  };

  const activeVideo = videos[currentIndex];
  const translateY =
    viewportHeight > 0
      ? `translate3d(0, ${-viewportHeight + dragOffset}px, 0)`
      : `translate3d(0, calc(-100dvh + ${dragOffset}px), 0)`;

  if (!activeVideo) {
    return null;
  }

  return (
    <div className="mobile-video-viewer" role="dialog" aria-modal="true" aria-label={closeLabel}>
      <button
        type="button"
        className="mobile-video-viewer-close"
        onClick={onClose}
        aria-label={closeLabel}
      >
        ✕
      </button>

      {hintLabel ? <div className="mobile-video-viewer-hint">{hintLabel}</div> : null}

      <div
        className="mobile-video-viewer-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishGesture}
        onTouchCancel={finishGesture}
      >
        <div
          className="mobile-video-viewer-track"
          style={{
            transform: translateY,
            transition: isDragging ? "none" : "transform 360ms ease-out",
          }}
        >
          {renderRange.map((entry) => {
            const isActive = entry.offset === 0;

            return (
              <article key={entry.key} className="mobile-video-viewer-slide">
                <iframe
                  ref={(node) => {
                    iframeRefs.current[entry.key] = node;
                  }}
                  className="mobile-video-viewer-frame"
                  src={buildEmbedUrl(entry.video.videoUrl, isActive)}
                  title={entry.video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="eager"
                />
                <button
                  type="button"
                  className="mobile-video-viewer-surface"
                  onClick={() => {
                    setIsPlaying((current) => !current);
                  }}
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                />

                <div className="mobile-video-viewer-overlay">
                  <h3 className="mobile-video-viewer-title">{entry.video.title}</h3>
                  {entry.video.description ? (
                    <p className="mobile-video-viewer-description">{entry.video.description}</p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
