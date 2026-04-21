"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import flightVideos from "@/utils/flight-video.json";

interface PlaneWindshieldProps {
  angle: number;
  pushPull: number;
}

export interface PlaneWindshieldRef {
  setVideoById: (id: string) => void;
}

const PlaneWindshield = forwardRef<PlaneWindshieldRef, PlaneWindshieldProps>(
  ({ angle, pushPull }, ref) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(
    "/supabase-storage/quests/1_quest/images/lamding-signal.webm"
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  function setVideoById(id: string) {
    let found: any = null;

    // ищем по всем уровням, включая special_weather
    Object.values(flightVideos).forEach((section: any) => {
      if (Array.isArray(section)) {
        const match = section.find((v: any) => v.id === id);
        if (match) found = match;
      } else if (typeof section === "object" && section !== null) {
        Object.values(section).forEach((sub: any) => {
          const match = sub.find((v: any) => v.id === id);
          if (match) found = match;
        });
      }
    });

    if (found?.url) {
      setVideoUrl(found.url);

      // перезапуск видео после смены
      setTimeout(() => {
        videoRef.current?.load();
        videoRef.current?.play().catch(() => {});
      }, 50);
    }
  }

  // отдаём наружу API
  useImperativeHandle(ref, () => ({
    setVideoById,
  }));

  return (
    <div style={styles.frame}>
      {videoUrl && (
        <div style={styles.hintOverlay}>
          {/* React will inject cockpit hints here */}
        </div>
      )}
      <div style={styles.ratioBox}>
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            style={{
              ...styles.video,
              objectPosition: `${Math.max(8, Math.min(92, 50 + angle * 1.35))}% ${Math.max(18, Math.min(82, 50 + pushPull * 1.25))}%`
            }}
          />
        )}
      </div>
    </div>
  );
});

export default PlaneWindshield;

//
// CSS-in-JS для простоты вставки
//
const styles: Record<string, any> = {
  frame: {
    position: "relative",
    zIndex: 700,
    width: "100%",
    maxWidth: "800px",
    background: "linear-gradient(145deg, #c7c7c7, #9e9e9e)",
    padding: "12px",
    borderRadius: "100px 100px 0 0", // верх круглый, низ плоский
    borderBottomLeftRadius: "0",
    borderBottomRightRadius: "0",
    boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
    margin: "0 auto",
  },

  ratioBox: {
    width: "100%",
    position: "relative",
    paddingBottom: "75%", // 4:3 (3/4 = 0.75)
    overflow: "hidden",
    borderRadius: "100px 100px 0 0",
  },

  video: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "object-position 0.08s linear",
  },

  hintOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
