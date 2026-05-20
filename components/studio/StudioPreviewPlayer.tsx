"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState, forwardRef } from "react";
import { resolveFontFamily } from "@/lib/fonts";
import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";
import type { CSSProperties } from "react";
import {
  getStudioMediaSafeLayout,
  getStudioTextSafeLayout,
} from "@/lib/studioSlideSafeLayout";
import {
  getStudioSlideDurationMs,
  getStudioWordTiming,
  tokenizeStudioText,
} from "@/lib/studioKaraokeText";

interface StudioPreviewPlayerProps {
  slides: StudioSlide[];
  musicEngineRef: React.RefObject<any>;
  onClose: () => void;
  lang: Lang;
  isExternalRecording?: boolean;
  resetSignal?: number;
  isMobileFullscreen?: boolean;
  loopPlayback?: boolean;
  onPlaybackComplete?: () => void;
  showWatermark?: boolean;
  showCloseButton?: boolean;
  isPlaybackEnabled?: boolean;
}

export function StudioStickerLayer({ slide }: { slide: StudioSlide }) {
  const stickers = [...(slide.stickers ?? [])]
    .filter((sticker) => sticker.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  if (stickers.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Sticker overlay layer"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      {stickers.map((sticker) => (
        sticker.animationType === "video" || /\.(mp4|webm)(?:\?|$)/i.test(sticker.sourceUrl) ? (
          <video
            key={sticker.id}
            src={sticker.sourceUrl}
            autoPlay
            muted
            loop
            playsInline
            draggable={false}
            style={{
              position: "absolute",
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              width: `${sticker.width}%`,
              height: `${sticker.height}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation ?? 0}deg)`,
              transformOrigin: "center center",
              objectFit: "contain",
              opacity: sticker.opacity ?? 1,
              zIndex: 10 + (sticker.zIndex ?? 0),
              userSelect: "none",
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- Animated sticker formats must bypass Next image optimization.
          <img
            key={sticker.id}
            src={sticker.sourceUrl}
            alt="animated sticker"
            draggable={false}
            style={{
              position: "absolute",
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              width: `${sticker.width}%`,
              height: `${sticker.height}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation ?? 0}deg)`,
              transformOrigin: "center center",
              objectFit: "contain",
              opacity: sticker.opacity ?? 1,
              zIndex: 10 + (sticker.zIndex ?? 0),
              userSelect: "none",
            }}
          />
        )
      ))}
    </div>
  );
}

interface StudioSlideMediaProps {
  slide: StudioSlide;
  playEpoch?: number;
  autoPlayVideo?: boolean;
  style?: CSSProperties;
  safeLayoutScale?: number;
}

function renderStudioText(slide: StudioSlide, options?: { animated?: boolean; playKey?: string }) {
  if (slide.introLayout !== "book-meta") {
    if (!options?.animated) {
      return slide.text;
    }

    const tokens = tokenizeStudioText(slide.text || "");
    const wordCount = tokens.filter((token) => token.kind === "word").length;
    const durationMs = getStudioSlideDurationMs(slide);

    return (
      <span className="studio-karaoke-text" key={options.playKey}>
        {tokens.map((token, index) => {
          if (token.kind === "space") {
            return <span key={`space-${index}`}>{token.text}</span>;
          }

          const timing = getStudioWordTiming({
            wordIndex: token.wordIndex,
            wordCount,
            durationMs,
          });

          return (
            <span
              key={`word-${index}-${token.text}`}
              className="studio-karaoke-word"
              style={{
                "--karaoke-color": timing.color,
                animationDelay: `${timing.startMs}ms`,
                animationDuration: `${timing.durationMs}ms`,
              } as React.CSSProperties}
            >
              {token.text}
            </span>
          );
        })}
      </span>
    );
  }

  const lines = (slide.text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      style={{
        display: "grid",
        gap: "0.5em",
        justifyItems: "center",
      }}
    >
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          style={{
            width: "100%",
            padding: index === 0 ? "0.5em 0.9em" : "0.42em 0.85em",
            borderRadius: 999,
            background: index === 0
              ? "rgba(255, 232, 239, 0.92)"
              : "rgba(255, 255, 255, 0.92)",
            boxShadow: "0 8px 24px rgba(148, 163, 184, 0.12)",
            fontWeight: index === 0 ? 900 : 700,
            fontSize: index === 0 ? "1.12em" : "0.86em",
            lineHeight: 1.15,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function StudioSlideMedia({
  slide,
  playEpoch = 0,
  autoPlayVideo = true,
  style,
  safeLayoutScale = 1,
}: StudioSlideMediaProps) {
  const [mediaAspectRatio, setMediaAspectRatio] = useState(9 / 16);
  const fitMode: "cover" | "contain" = slide.mediaFit ?? "cover";
  const canvasAspectRatio = 9 / 16;

  useEffect(() => {
    setMediaAspectRatio(9 / 16);
  }, [slide.id, slide.mediaUrl]);

  function getMediaFrame() {
    if (fitMode === "cover") {
      return {
        width: "100%",
        height: "100%",
        left: "0%",
        top: "0%",
      };
    }

    const safeMediaAspectRatio = mediaAspectRatio > 0 ? mediaAspectRatio : canvasAspectRatio;

    if (safeMediaAspectRatio > canvasAspectRatio) {
      const heightPercent = (canvasAspectRatio / safeMediaAspectRatio) * 100;
      let topPercent = (100 - heightPercent) / 2;

      if ((slide.mediaPosition ?? "center") === "top") {
        topPercent = 0;
      } else if ((slide.mediaPosition ?? "center") === "bottom") {
        topPercent = 100 - heightPercent;
      }

      return {
        width: "100%",
        height: `${heightPercent}%`,
        left: "0%",
        top: `${topPercent}%`,
      };
    }

    const widthPercent = (safeMediaAspectRatio / canvasAspectRatio) * 100;
    return {
      width: `${widthPercent}%`,
      height: "100%",
      left: `${(100 - widthPercent) / 2}%`,
      top: "0%",
    };
  }

  const mediaFrame = getMediaFrame();
  const layoutWidth = 360 * safeLayoutScale;
  const layoutHeight = 640 * safeLayoutScale;
  const safeFontSize = (slide.fontSize || 28) * safeLayoutScale;
  const estimatedTextLayout = slide.text?.trim()
    ? getStudioTextSafeLayout({
        slide,
        canvasWidth: layoutWidth,
        canvasHeight: layoutHeight,
        fontSize: safeFontSize,
        lineHeight: safeFontSize * 1.12,
        maxWidth: layoutWidth * 0.92,
        measureText: (line) => line.length * safeFontSize * 0.56,
        offsetScale: safeLayoutScale,
        mediaAspectRatio,
      })
    : null;
  const mediaSafeLayout = getStudioMediaSafeLayout({
    slide,
    canvasWidth: layoutWidth,
    canvasHeight: layoutHeight,
    mediaAspectRatio,
    textLayout: estimatedTextLayout ?? undefined,
    offsetScale: safeLayoutScale,
  });
  const mediaPosition =
    slide.mediaPosition === "top"
      ? "center top"
      : slide.mediaPosition === "bottom"
        ? "center bottom"
        : "center center";

  if (!slide.mediaUrl) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        width: mediaFrame.width,
        height: mediaFrame.height,
        left: mediaFrame.left,
        top: mediaFrame.top,
        overflow: "hidden",
        zIndex: 1,
        transform: `translate(${(slide.mediaOffsetX ?? 0) * safeLayoutScale}px, ${(slide.mediaOffsetY ?? 0) * safeLayoutScale + mediaSafeLayout.offsetY}px) scale(${slide.mediaScale ?? 1})`,
        transformOrigin: "center center",
        ...style,
      }}
    >
      {slide.mediaType === "video" ? (
        <video
          key={`${slide.id}-${playEpoch}`}
          src={slide.mediaUrl}
          autoPlay={autoPlayVideo}
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: fitMode,
            objectPosition: fitMode === "cover" ? mediaPosition : "center center",
            zIndex: 1,
          }}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            if (element.videoWidth > 0 && element.videoHeight > 0) {
              setMediaAspectRatio(element.videoWidth / element.videoHeight);
            }
          }}
        />
      ) : (
        <Image
          key={`${slide.id}:${slide.mediaUrl}:${playEpoch}`}
          src={slide.mediaUrl}
          alt={slide.text?.trim() || "illustration"}
          fill
          unoptimized
          sizes="100vw"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: fitMode,
            objectPosition: fitMode === "cover" ? mediaPosition : "center center",
            zIndex: 1,
          }}
          onLoad={(event) => {
            const element = event.currentTarget;
            if (element.naturalWidth > 0 && element.naturalHeight > 0) {
              setMediaAspectRatio(element.naturalWidth / element.naturalHeight);
            }
          }}
        />
      )}
    </div>
  );
}

const StudioPreviewPlayer = forwardRef<HTMLDivElement, StudioPreviewPlayerProps>(
  function StudioPreviewPlayer(
    {
      slides,
      musicEngineRef,
      lang,
      onClose,
      resetSignal,
      isMobileFullscreen = false,
      loopPlayback = true,
      onPlaybackComplete,
      showWatermark = false,
      showCloseButton = true,
      isPlaybackEnabled = true,
    },
    containerRef,
  ) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playEpoch, setPlayEpoch] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const voiceRef = useRef<HTMLAudioElement | null>(null);

    const t = dictionaries[lang].cats.studio;

    const isExportMode =
      typeof document !== "undefined" &&
      document.body.classList.contains("export-mode");

    const currentSlide = slides[currentIndex];
    const watermarkStyle = isMobileFullscreen
      ? {
          top: 10,
          right: 10,
          width: 56,
        }
      : {
          top: 40,
          right: 40,
          width: 200,
        };

    // --- HARD RESET: timer + voice + music + media epoch
    useEffect(() => {
      if (resetSignal === undefined) return;

      // Stop slide timer immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Stop voice immediately
      if (voiceRef.current) {
        try {
          voiceRef.current.pause();
          voiceRef.current.currentTime = 0;
        } catch {}
      }

      // Restore music in case it was ducked
      try {
        musicEngineRef?.current?.restoreMusic?.();
      } catch {}

      // Restart background music from the beginning (if supported)
      try {
        musicEngineRef?.current?.pauseAll?.();
      } catch {}

      // Reset to first slide and bump epoch to force media/audio remount
      setCurrentIndex(0);
      setPlayEpoch((e) => e + 1);

      // Try to start music again on next tick
      if (isPlaybackEnabled) {
        setTimeout(() => {
          try {
            musicEngineRef?.current?.playAll?.();
          } catch {}
        }, 0);
      }
    }, [resetSignal, musicEngineRef, isPlaybackEnabled]);

    // --- Start music when preview mounts, stop on unmount
    useEffect(() => {
      if (!isPlaybackEnabled) {
        try {
          musicEngineRef?.current?.pauseAll?.();
        } catch {}
        return;
      }

      if (musicEngineRef?.current?.playAll) {
        musicEngineRef.current.playAll();
      }

      const musicEngine = musicEngineRef?.current;
      return () => {
        if (musicEngine?.pauseAll) {
          musicEngine.pauseAll();
        }
      };
    }, [isPlaybackEnabled, musicEngineRef]);

    // --- Auto duration logic (voice or default 3s)
    useEffect(() => {
      if (!isPlaybackEnabled) return;
      if (!currentSlide) return;

      const duration =
        currentSlide.voiceDuration && currentSlide.voiceDuration > 0
          ? currentSlide.voiceDuration * 1000
          : 3000;

      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => {
          const isLastSlide = prev >= slides.length - 1;
          if (isLastSlide) {
            if (!loopPlayback) {
              onPlaybackComplete?.();
              return prev;
            }

            return 0;
          }

          return prev + 1;
        });
      }, duration);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [currentIndex, slides, currentSlide, playEpoch, loopPlayback, onPlaybackComplete, isPlaybackEnabled]);

    useEffect(() => {
      const audio = voiceRef.current;
      if (!audio) {
        return;
      }

      if (!isPlaybackEnabled) {
        try {
          audio.pause();
          audio.currentTime = 0;
          musicEngineRef?.current?.restoreMusic?.();
        } catch {}
        return;
      }

      if (!currentSlide?.voiceUrl) {
        try {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          musicEngineRef?.current?.restoreMusic?.();
        } catch {}
        return;
      }

      try {
        audio.currentTime = 0;
      } catch {}

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    }, [currentIndex, currentSlide?.voiceUrl, musicEngineRef, playEpoch, isPlaybackEnabled]);

    if (!currentSlide) return null;

    const safeLayoutScale = isExportMode ? 3 : 1;
    const previewWidth = 360 * safeLayoutScale;
    const previewHeight = 640 * safeLayoutScale;
    const previewFontSize = (currentSlide.fontSize || 28) * safeLayoutScale;
    const previewTextLayout = currentSlide.text?.trim()
      ? getStudioTextSafeLayout({
          slide: currentSlide,
          canvasWidth: previewWidth,
          canvasHeight: previewHeight,
          fontSize: previewFontSize,
          lineHeight: previewFontSize * 1.12,
          offsetScale: safeLayoutScale,
        })
      : null;
    const previewTextBaseTranslate = "translate(-50%, -50%)";

    return (
      <div
        className="studio-preview-player"
        style={{
          position: "relative",
          width: isMobileFullscreen ? "100%" : undefined,
          height: isMobileFullscreen ? "100%" : undefined,
          background: isMobileFullscreen ? currentSlide.bgColor || "#000" : undefined,
          overflow: isMobileFullscreen ? "hidden" : undefined,
        }}
      >
        {!isExportMode && showCloseButton ? (
          <button
            className="preview-close-button"
            onClick={onClose}
            style={isMobileFullscreen ? {
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 20,
              minHeight: 40,
              padding: "8px 12px",
              borderRadius: 999,
              border: "none",
              background: "rgba(17,17,17,0.82)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
            } : undefined}
          >
            {t.closePreview}
          </button>
        ) : null}

        <div
          ref={containerRef}
          className="preview-canvas-9x16"
          style={{
            position: "relative",
            width: isExportMode ? 1080 : isMobileFullscreen ? "100%" : 360,
            height: isExportMode ? 1920 : isMobileFullscreen ? "100%" : 640,
            aspectRatio: "9 / 16",
            overflow: "hidden",
            backgroundColor: currentSlide.bgColor || "#000",
            display: "block",
          }}
        >
          {/* MEDIA */}
          {currentSlide.mediaUrl ? (
            <StudioSlideMedia
              slide={currentSlide}
              playEpoch={isPlaybackEnabled ? playEpoch : 0}
              autoPlayVideo={isPlaybackEnabled}
              safeLayoutScale={safeLayoutScale}
            />
          ) : null}

          <StudioStickerLayer slide={currentSlide} />

          {/* VOICE */}
          <audio
            ref={voiceRef}
            src={currentSlide.voiceUrl || undefined}
            autoPlay
            playsInline
            preload="auto"
            onPlay={() => {
              try {
                musicEngineRef?.current?.duckMusic?.();
              } catch {}
            }}
            onEnded={() => {
              try {
                musicEngineRef?.current?.restoreMusic?.();
              } catch {}
            }}
            onPause={() => {
              try {
                musicEngineRef?.current?.restoreMusic?.();
              } catch {}
            }}
          />

          {/* TEXT */}
          {currentSlide.text && (
              <div
                style={{
                  padding: 20,
                textAlign: "center",
                fontSize: isExportMode
                  ? (currentSlide.fontSize || 28) * (1080 / 360)
                  : currentSlide.fontSize || 28,
                fontFamily: resolveFontFamily(currentSlide.fontFamily),
                color: currentSlide.textColor || "#fff",
                background: currentSlide.textBgEnabled
                  ? (() => {
                      const base = currentSlide.textBgColor || '#ffffff';
                      const opacity = currentSlide.textBgOpacity ?? 0.62;
                      if (base.startsWith('#')) {
                        const hex = base.replace('#', '');
                        const bigint = parseInt(hex.length === 3
                          ? hex.split('').map(c => c + c).join('')
                          : hex, 16);
                        const r = (bigint >> 16) & 255;
                        const g = (bigint >> 8) & 255;
                        const b = bigint & 255;
                        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                      }
                      return base;
                    })()
                  : "transparent",
                opacity: 1,
                display: "block",
                boxSizing: "border-box",
                width: previewTextLayout ? `${(previewTextLayout.maxWidth / previewWidth) * 100}%` : "90%",
                maxWidth: previewTextLayout ? `${(previewTextLayout.maxWidth / previewWidth) * 100}%` : "90%",
                borderRadius: currentSlide.textBgEnabled ? 16 : 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                position: "absolute",
                left: previewTextLayout ? `${(previewTextLayout.x / previewWidth) * 100}%` : "50%",
                top: previewTextLayout ? `${(previewTextLayout.y / previewHeight) * 100}%` : "50%",
                zIndex: 20,
                  transform: previewTextBaseTranslate,
                }}
              >
                {renderStudioText(currentSlide, {
                  animated: isPlaybackEnabled,
                  playKey: `${currentSlide.id}-${currentIndex}-${playEpoch}`,
                })}
              </div>
            )}

          {/* WATERMARK (EXPORT ONLY) */}
          {(isExportMode || showWatermark) && (
            <Image
              src="/icons/watermark.webp"
              alt="watermark"
              width={1668}
              height={1668}
              style={{
                position: "absolute",
                ...watermarkStyle,
                height: "auto",
                opacity: 0.8,
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 5,
              }}
            />
          )}
        </div>

        {recordingStyles}
      </div>
    );
  },
);

const recordingStyles = (
  <style jsx global>{`
    @keyframes pulse {
      0% {
        opacity: 1;
      }
      50% {
        opacity: 0.3;
      }
      100% {
        opacity: 1;
      }
    }
    @keyframes recordBar {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
    @keyframes studioKaraokeWord {
      0%,
      100% {
        transform: scale(1);
        background: transparent;
        color: inherit;
      }
      18%,
      72% {
        transform: scale(1.1);
        background: var(--karaoke-color);
        color: #111;
      }
    }
    .studio-karaoke-text {
      display: inline;
    }
    .studio-karaoke-word {
      display: inline-block;
      padding: 0 0.18em;
      margin: 0 -0.04em;
      border-radius: 0.32em;
      transform-origin: center;
      animation-name: studioKaraokeWord;
      animation-timing-function: ease-in-out;
      animation-fill-mode: both;
    }
  `}</style>
);

export default StudioPreviewPlayer;
