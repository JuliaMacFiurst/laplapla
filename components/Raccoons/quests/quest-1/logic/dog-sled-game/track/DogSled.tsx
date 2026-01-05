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

import { useLayoutEffect, useRef, useState, useEffect } from "react";

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
  /** вертикальная позиция саней (внутри road) */
  y: number;

  /** текущее состояние */
  state: DogSledState;

  /** масштаб (на будущее) */
  scale?: number;

  /** верхняя граница дороги (локальная) */
  clampTop?: number;

  /** нижняя граница дороги (локальная) */
  clampBottom?: number;
}

/* ──────────────────────────────
 * Component
 * ────────────────────────────── */

export default function DogSled({
  y,
  state,
  clampTop,
  clampBottom,
}: DogSledProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sledHeight, setSledHeight] = useState(0);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSledHeight(rect.height || 0);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Новая логика вычисления clampedY с учётом высоты саней
  const minY = typeof clampTop === "number" ? clampTop : 0;
  const maxY =
    typeof clampBottom === "number"
      ? clampBottom - sledHeight
      : Infinity;
  const clampedY = Math.min(
    Math.max(y, minY),
    maxY
  );

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
      ref={rootRef}
      className="dog-sled"
      style={{
        position: "absolute",
        left: "30%",      // фиксированная позиция внутри дороги
        top: clampedY,
        pointerEvents: "none",
        zIndex: 50,
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
          width: "50%",
          height: "auto",
        }}
      />
    </div>
  );
}