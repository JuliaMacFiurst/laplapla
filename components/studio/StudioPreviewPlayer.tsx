"use client";

import React, { useEffect, useRef, useState, forwardRef } from "react";
import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface StudioPreviewPlayerProps {
  slides: StudioSlide[];
  musicEngineRef: React.RefObject<any>;
  onClose: () => void;
  lang: Lang;
  isExternalRecording?: boolean;
  resetSignal?: number;
}

const StudioPreviewPlayer = forwardRef<HTMLDivElement, StudioPreviewPlayerProps>(
  function StudioPreviewPlayer(
    {
      slides,
      musicEngineRef,
      lang,
      onClose,
      isExternalRecording,
      resetSignal,
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
      setTimeout(() => {
        try {
          musicEngineRef?.current?.playAll?.();
        } catch {}
      }, 0);
    }, [resetSignal, musicEngineRef]);

    // --- Start music when preview mounts, stop on unmount
    useEffect(() => {
      if (musicEngineRef?.current?.playAll) {
        musicEngineRef.current.playAll();
      }

      return () => {
        if (musicEngineRef?.current?.pauseAll) {
          musicEngineRef.current.pauseAll();
        }
      };
    }, [musicEngineRef]);

    // --- Auto duration logic (voice or default 3s)
    useEffect(() => {
      if (!currentSlide) return;

      const duration =
        currentSlide.voiceDuration && currentSlide.voiceDuration > 0
          ? currentSlide.voiceDuration * 1000
          : 3000;

      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, duration);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [currentIndex, slides, currentSlide, playEpoch]);

    if (!currentSlide) return null;

    return (
      <div className="studio-preview-player" style={{ position: "relative" }}>
        {!isExportMode && (
          <button className="preview-close-button" onClick={onClose}>
            {t.closePreview}
          </button>
        )}

        <div
          ref={containerRef}
          className="preview-canvas-9x16"
          style={{
            position: "relative",
            width: isExportMode ? 1080 : 360,
            height: isExportMode ? 1920 : 640,
            aspectRatio: "9 / 16",
            overflow: "hidden",
            backgroundColor: currentSlide.bgColor || "#000",
            display: "flex",
            justifyContent: "center",
            alignItems:
              currentSlide.textPosition === "top"
                ? "flex-start"
                : currentSlide.textPosition === "bottom"
                  ? "flex-end"
                  : "center",
          }}
        >
          {/* MEDIA */}
          {currentSlide.mediaUrl && (
            <>
              {currentSlide.mediaType === "video" ? (
                <video
                  key={`${currentSlide.id}-${playEpoch}`}
                  src={currentSlide.mediaUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    objectFit: currentSlide.mediaFit || "cover",
                    objectPosition:
                      currentSlide.mediaPosition === "top"
                        ? "center top"
                        : currentSlide.mediaPosition === "bottom"
                          ? "center bottom"
                          : "center center",
                    zIndex: 1,
                  }}
                />
              ) : (
                <img
                  src={currentSlide.mediaUrl}
                  alt=""
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    objectFit: currentSlide.mediaFit || "cover",
                    objectPosition:
                      currentSlide.mediaPosition === "top"
                        ? "center top"
                        : currentSlide.mediaPosition === "bottom"
                          ? "center bottom"
                          : "center center",
                    zIndex: 1,
                  }}
                />
              )}
            </>
          )}

          {/* VOICE */}
          {currentSlide.voiceUrl && (
            <audio
              key={`${currentSlide.id}-${playEpoch}`}
              ref={voiceRef}
              src={currentSlide.voiceUrl}
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
          )}

          {/* TEXT */}
          {currentSlide.text && (
            <div
              style={{
                padding: 20,
                textAlign: currentSlide.textAlign || "center",
                fontSize: isExportMode
                  ? (currentSlide.fontSize || 28) * (1080 / 360)
                  : currentSlide.fontSize || 28,
                fontFamily: currentSlide.fontFamily || "'Amatic SC', cursive",
                color: currentSlide.textColor || "#fff",
                background: currentSlide.textBgEnabled
                  ? (() => {
                      const base = currentSlide.textBgColor || '#000000';
                      const opacity = currentSlide.textBgOpacity ?? 0.5;
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
                display: "inline-block",
                maxWidth: "90%",
                borderRadius: currentSlide.textBgEnabled ? 16 : 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                position: "relative",
                zIndex: 2,
              }}
            >
              {currentSlide.text}
            </div>
          )}

          {/* WATERMARK (EXPORT ONLY) */}
          {isExportMode && (
            <img
              src="/icons/watermark.webp"
              alt="watermark"
              style={{
                position: "absolute",
                top: 40,
                right: 40,
                width: 200,
                opacity: 0.8,
                pointerEvents: "none",
                userSelect: "none",
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
  `}</style>
);

export default StudioPreviewPlayer;