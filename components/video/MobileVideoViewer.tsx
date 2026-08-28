"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export type VideoItem = {
  id: string;
  title: string;
  description?: string;
  youtubeId: string;
  thumbnailUrl: string;
};

type PlayerLabels = {
  loading: string;
  failed: string;
  openYouTube: string;
  play: string;
  pause: string;
  soundOn: string;
  soundOff: string;
};

type Props = {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
  closeLabel?: string;
  hintLabel?: string;
  labels: PlayerLabels;
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

function buildEmbedUrl(youtubeId: string) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
  });

  if (typeof window !== "undefined") {
    params.set("origin", window.location.origin);
  }

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

type YoutubeCommand = "playVideo" | "pauseVideo" | "mute" | "unMute";

function postYoutubeCommand(iframe: HTMLIFrameElement | null, func: YoutubeCommand) {
  if (!iframe?.contentWindow) {
    return;
  }

  iframe.contentWindow.postMessage(
    JSON.stringify({
      event: "command",
      func,
      args: [],
    }),
    "https://www.youtube-nocookie.com"
  );
}

export default function MobileVideoViewer({
  videos,
  initialIndex,
  onClose,
  closeLabel = "Close video",
  hintLabel,
  labels,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialIndex, Math.max(0, videos.length - 1))
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [playerState, setPlayerState] = useState<"loading" | "ready" | "failed">("loading");
  const [viewportHeight, setViewportHeight] = useState(0);

  const startYRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);

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
    setPlayerState("loading");
    setIsPlaying(true);
    setIsMuted(true);

    readyTimeoutRef.current = window.setTimeout(() => {
      setPlayerState((current) => current === "ready" ? current : "failed");
    }, 15000);

    const handleYoutubeMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube-nocookie.com" || event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      let payload: { event?: string; info?: unknown } | null = null;
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (payload?.event === "onReady") {
        if (readyTimeoutRef.current !== null) window.clearTimeout(readyTimeoutRef.current);
        setPlayerState("ready");
        postYoutubeCommand(iframeRef.current, "playVideo");
      } else if (payload?.event === "onError") {
        if (readyTimeoutRef.current !== null) window.clearTimeout(readyTimeoutRef.current);
        setPlayerState("failed");
      }
    };

    window.addEventListener("message", handleYoutubeMessage);
    return () => {
      window.removeEventListener("message", handleYoutubeMessage);
      if (readyTimeoutRef.current !== null) window.clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    };
  }, [currentIndex]);

  useEffect(() => {
    if (playerState !== "ready") return;
    postYoutubeCommand(iframeRef.current, isPlaying ? "playVideo" : "pauseVideo");
  }, [isPlaying, playerState]);

  const registerYoutubeListeners = () => {
    const playerWindow = iframeRef.current?.contentWindow;
    if (!playerWindow) return;

    ["onReady", "onError"].forEach((eventName) => {
      playerWindow.postMessage(JSON.stringify({ event: "listening", id: activeVideo.id }), "https://www.youtube-nocookie.com");
      playerWindow.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: [eventName] }),
        "https://www.youtube-nocookie.com"
      );
    });
  };

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
      if (playerState === "ready") postYoutubeCommand(iframeRef.current, "pauseVideo");
      setCurrentIndex(nextIndex);
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
                {isActive && playerState !== "failed" ? (
                  <iframe
                    key={entry.video.youtubeId}
                    ref={iframeRef}
                    className="mobile-video-viewer-frame"
                    src={buildEmbedUrl(entry.video.youtubeId)}
                    title={entry.video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="eager"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={registerYoutubeListeners}
                    onError={() => setPlayerState("failed")}
                  />
                ) : (
                  <Image
                    className="mobile-video-viewer-preview"
                    src={entry.video.thumbnailUrl}
                    alt=""
                    fill
                    sizes="100vw"
                    unoptimized
                    priority={false}
                  />
                )}

                {isActive && playerState === "loading" ? (
                  <div className="mobile-video-viewer-status" role="status">{labels.loading}</div>
                ) : null}

                {isActive && playerState === "failed" ? (
                  <div className="mobile-video-viewer-fallback" role="alert">
                    <p>{labels.failed}</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${encodeURIComponent(entry.video.youtubeId)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {labels.openYouTube}
                    </a>
                  </div>
                ) : null}

                {isActive && playerState !== "failed" ? (
                  <button
                    type="button"
                    className="mobile-video-viewer-surface"
                    onClick={() => setIsPlaying((current) => !current)}
                    aria-label={isPlaying ? labels.pause : labels.play}
                    disabled={playerState !== "ready"}
                  />
                ) : null}

                {isActive && playerState === "ready" ? (
                  <div className="mobile-video-viewer-controls">
                    <button
                      type="button"
                      onClick={() => {
                        const nextMuted = !isMuted;
                        postYoutubeCommand(iframeRef.current, nextMuted ? "mute" : "unMute");
                        if (!nextMuted) postYoutubeCommand(iframeRef.current, "playVideo");
                        setIsMuted(nextMuted);
                        setIsPlaying(true);
                      }}
                      aria-label={isMuted ? labels.soundOn : labels.soundOff}
                    >
                      <span aria-hidden="true">{isMuted ? "🔇" : "🔊"}</span>
                      {isMuted ? labels.soundOn : labels.soundOff}
                    </button>
                  </div>
                ) : null}

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
