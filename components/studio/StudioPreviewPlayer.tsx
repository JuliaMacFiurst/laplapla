"use client";

import React, { useEffect, useRef, useState } from "react";
import type { StudioSlide } from "@/types/studio";
import { dictionaries, type Lang } from "@/i18n";

interface StudioPreviewPlayerProps {
  slides: StudioSlide[];
  musicEngineRef: React.RefObject<any>;
  onClose: () => void;
  lang: Lang;
}

export default function StudioPreviewPlayer({
  slides,
  musicEngineRef,
  lang,
  onClose,
}: StudioPreviewPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  const t = dictionaries[lang].cats.studio

  const currentSlide = slides[currentIndex];

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
  }, []);

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
  }, [currentIndex, slides, currentSlide]);

  // --- Play voice per slide
  useEffect(() => {
    if (!currentSlide?.voiceUrl) return;

    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current.currentTime = 0;
    }

    const audio = new Audio(currentSlide.voiceUrl);
    voiceRef.current = audio;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [currentSlide?.voiceUrl]);

  if (!currentSlide) return null;

  return (
    <div className="studio-preview-player">
      <button className="preview-close-button" onClick={onClose}>{t.closePreview}</button>

      <div
        className="preview-canvas-9x16"
        style={{
          position: "relative",
          width: 360,
          height: 640,
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
                src={currentSlide.mediaUrl}
                autoPlay
                muted
                loop
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
                }}
              />
            )}
          </>
        )}

        {/* TEXT */}
        {currentSlide.text && (
          <div
            style={{
              padding: 20,
              textAlign: currentSlide.textAlign || "center",
              fontSize: currentSlide.fontSize || 28,
              fontFamily: currentSlide.fontFamily || "'Amatic SC', cursive",
              color: currentSlide.textColor || "#fff",
              background:
                currentSlide.textBgEnabled
                  ? `rgba(0,0,0,${currentSlide.textBgOpacity ?? 0.5})`
                  : "transparent",
              display: "inline-block",
              maxWidth: "90%",
              borderRadius: currentSlide.textBgEnabled ? 16 : 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {currentSlide.text}
          </div>
        )}
      </div>
    </div>
  );
}