"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SOURCES = [
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/capybara/cappy-typping1.webm",
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/capybara/cappy-typping2.webm",
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/capybara/cappy-typping3.webm",
] as const;

const FALLBACK_IMAGE =
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/capybara/capybara_typping-pic.webp";

const getRandomDelay = () => 2000 + Math.floor(Math.random() * 2001);

export default function CapybaraTypingAnimation() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlayingVideo) {
      return;
    }

    void videoRef.current?.play().catch(() => {});
  }, [currentVideoIndex, isPlayingVideo]);

  const handleEnded = () => {
    setIsPlayingVideo(false);

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % VIDEO_SOURCES.length);
      setIsPlayingVideo(true);
      timeoutRef.current = null;
    }, getRandomDelay());
  };

  if (!isPlayingVideo) {
    return (
      <img
        src={FALLBACK_IMAGE}
        alt="Capybara typing"
      />
    );
  }

  return (
    <video
      key={VIDEO_SOURCES[currentVideoIndex]}
      ref={videoRef}
      className="story-capybara-video"
      src={VIDEO_SOURCES[currentVideoIndex]}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={handleEnded}
    />
  );
}
