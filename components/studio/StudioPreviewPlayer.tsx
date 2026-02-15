

"use client";

import React, { useEffect, useRef, useState } from "react";
import type { StudioSlide } from "@/types/studio";

interface StudioPreviewPlayerProps {
  slides: StudioSlide[];
  musicEngineRef: React.RefObject<any>;
  onClose: () => void;
}

export default function StudioPreviewPlayer({
  slides,
  musicEngineRef,
  onClose,
}: StudioPreviewPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  const currentSlide = slides[currentIndex];

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

    const audio = new Audio(currentSlide.voiceUrl);
    voiceRef.current = audio;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [currentIndex]);

  if (!currentSlide) return null;

  return (
    <div className="studio-preview-player">
      <button onClick={onClose}>Close Preview</button>

      <div
        className="preview-canvas-9x16"
        style={{
          position: "relative",
          width: 360,
          height: 640,
          aspectRatio: "9 / 16",
          overflow: "hidden",
          backgroundColor: currentSlide.bgColor || "#000",
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
                  width:
                    currentSlide.mediaFit === "contain" ? "100%" : "auto",
                  height:
                    currentSlide.mediaFit === "cover" ? "100%" : "auto",
                  objectFit: currentSlide.mediaFit || "cover",
                  objectPosition:
                    currentSlide.mediaPosition === "top"
                      ? "top"
                      : currentSlide.mediaPosition === "bottom"
                      ? "bottom"
                      : "center",
                }}
              />
            ) : (
              <img
                src={currentSlide.mediaUrl}
                alt=""
                style={{
                  position: "absolute",
                  width:
                    currentSlide.mediaFit === "contain" ? "100%" : "auto",
                  height:
                    currentSlide.mediaFit === "cover" ? "100%" : "auto",
                  objectFit: currentSlide.mediaFit || "cover",
                  objectPosition:
                    currentSlide.mediaPosition === "top"
                      ? "top"
                      : currentSlide.mediaPosition === "bottom"
                      ? "bottom"
                      : "center",
                }}
              />
            )}
          </>
        )}

        {/* TEXT */}
        {currentSlide.text && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              padding: 20,
              top:
                currentSlide.textPosition === "top"
                  ? 40
                  : currentSlide.textPosition === "bottom"
                  ? "auto"
                  : "50%",
              bottom:
                currentSlide.textPosition === "bottom" ? 40 : "auto",
              transform:
                currentSlide.textPosition === "center"
                  ? "translateY(-50%)"
                  : "none",
              textAlign: currentSlide.textAlign || "center",
              fontSize: currentSlide.fontSize || 28,
              fontFamily: currentSlide.fontFamily || "'Amatic SC', cursive",
              color: currentSlide.textColor || "#fff",
              background:
                currentSlide.textBgEnabled
                  ? `rgba(0,0,0,${currentSlide.textBgOpacity ?? 0.5})`
                  : "transparent",
              borderRadius: currentSlide.textBgEnabled ? 16 : 0,
            }}
          >
            {currentSlide.text}
          </div>
        )}
      </div>
    </div>
  );
}