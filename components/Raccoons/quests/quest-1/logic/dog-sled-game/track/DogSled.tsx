"use client";

/**
 * DogSled
 * =======
 *
 * ВИЗУАЛЬНЫЙ компонент саней.
 *
 * ❗️Принципиально:
 * - НЕТ логики игры
 * - НЕТ знаний про зоны, столкновения, тайминги
 * - ТОЛЬКО отображение состояния
 *
 * Управляется извне через `state`.
 * Видео — источник истины для анимации.
 */

import { useRef, useEffect } from "react";

/* ──────────────────────────────
 * Типы состояний саней
 * ────────────────────────────── */

export type DogSledState =
  | "run_fast"        // собаки быстро бегут
  | "run_tired"       // собаки устали
  | "slow_down"       // замедление вплоть до остановки
  | "hooked"          // зацепились за препятствие
  | "crash"           // человек вылетает из саней
  | "recover";        // человек забирается обратно

/* ──────────────────────────────
 * Конфигурация видео
 * ────────────────────────────── */

interface DogSledVideoConfig {
  src: string;
  loop: boolean;
}
const DOG_SLED_VIDEOS: Record<DogSledState, DogSledVideoConfig> = {
  run_fast: {
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/riding-sled/run_fast.webm",
    loop: true,
  },
  run_tired: {
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/riding-sled/run_tired.webm",
    loop: true,
  },
  slow_down: {
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/riding-sled/slow.webm",
    loop: false,
  },
  hooked: {
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/riding-sled/hit_obsracle.webm",
    loop: false,
  },
  crash: {
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/riding-sled/fall.webm",
    loop: false,
  },
  recover: {
    src: "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/games/riding-sled/recover.webm",
    loop: false,
  },
};

/* ──────────────────────────────
 * Props
 * ────────────────────────────── */

interface DogSledProps {
  /** вертикальная позиция саней ВНУТРИ road (Y-центр, а не top) */
  y: number;

  /** текущее состояние */
  state: DogSledState;

  /** масштаб (на будущее) */
  scale?: number;
}

/* ──────────────────────────────
 * Logical visual height constant
 * ────────────────────────────── */

const SLED_VISUAL_HEIGHT_PX = 230;

/* ──────────────────────────────
 * Component
 * ────────────────────────────── */

export default function DogSled({
  y,
  state,
}: DogSledProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const video = DOG_SLED_VIDEOS[state];

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const cfg = DOG_SLED_VIDEOS[state];
    if (!cfg) return;

    if (el.src !== cfg.src) {
      el.src = cfg.src;
      el.loop = cfg.loop;
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.loop = cfg.loop;
    }
  }, [state]);

  if (!video) return null;

  return (
    <div
      className="dog-sled"
      style={{
        position: "absolute",
        left: "30%", // фиксированная позиция внутри дороги
        top: y,
        transform: "translateY(-50%)", // y = центр саней
        pointerEvents: "none",
        zIndex: 50,
        willChange: "transform, top",
      }}
    >
      <video
        ref={videoRef}
        src={video.src}
        autoPlay
        muted
        loop={video.loop}
        playsInline
        style={{
          display: "block",
          height: `${SLED_VISUAL_HEIGHT_PX}px`,
          width: "auto",
        }}
      />
    </div>
  );
}