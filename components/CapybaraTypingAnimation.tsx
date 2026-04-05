"use client";

import { useEffect, useRef, useState } from "react";
import { buildSupabaseStorageUrl } from "@/lib/publicAssetUrls";

const VIDEO_SOURCES = [
  buildSupabaseStorageUrl("characters/capybara/cappy-typping1.webm"),
  buildSupabaseStorageUrl("characters/capybara/cappy-typping2.webm"),
  buildSupabaseStorageUrl("characters/capybara/cappy-typping3.webm"),
] as const;

const FALLBACK_IMAGE =
  buildSupabaseStorageUrl("characters/capybara/capybara_typping-pic.webp");

const FADE_MS = 220;
const getRandomDelay = () => 2000 + Math.floor(Math.random() * 2001);

export default function CapybaraTypingAnimation() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const freezeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (freezeTimeoutRef.current !== null) {
        clearTimeout(freezeTimeoutRef.current);
      }
      if (swapTimeoutRef.current !== null) {
        clearTimeout(swapTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showVideo || !videoReady) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.currentTime = 0;
    void video.play().catch(() => {});
  }, [currentVideoIndex, showVideo, videoReady]);

  const handleVideoReady = () => {
    setVideoReady(true);
  };

  const handleEnded = () => {
    setShowVideo(false);

    if (freezeTimeoutRef.current !== null) {
      clearTimeout(freezeTimeoutRef.current);
    }
    if (swapTimeoutRef.current !== null) {
      clearTimeout(swapTimeoutRef.current);
    }

    freezeTimeoutRef.current = setTimeout(() => {
      setVideoReady(false);
      setCurrentVideoIndex((prev) => (prev + 1) % VIDEO_SOURCES.length);

      swapTimeoutRef.current = setTimeout(() => {
        setShowVideo(true);
        swapTimeoutRef.current = null;
      }, FADE_MS);

      freezeTimeoutRef.current = null;
    }, getRandomDelay());
  };

  return (
    <div className="story-capybara-animation">
      <div
        className="story-capybara-layer story-capybara-backdrop is-visible"
        aria-hidden="true"
        style={{ zIndex: 0, opacity: 1 }}
      />

      <video
        key={VIDEO_SOURCES[currentVideoIndex]}
        ref={videoRef}
        className={`story-capybara-layer story-capybara-video ${showVideo && videoReady ? "is-visible" : ""}`}
        style={{
          zIndex: 1,
          opacity: showVideo && videoReady ? 1 : 0,
        }}
        src={VIDEO_SOURCES[currentVideoIndex]}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={handleVideoReady}
        onCanPlay={handleVideoReady}
        onEnded={handleEnded}
      />

      <img
        src={FALLBACK_IMAGE}
        alt="Capybara typing"
        className={`story-capybara-layer story-capybara-image ${showVideo ? "" : "is-visible"}`}
        style={{
          zIndex: 2,
          opacity: showVideo ? 0 : 1,
        }}
        draggable={false}
      />
    </div>
  );
}
