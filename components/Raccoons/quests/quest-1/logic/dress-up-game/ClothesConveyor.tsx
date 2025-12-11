"use client";

import { useEffect, useRef } from "react";

export interface ClothesItem {
  id: string;
  img: string;
  score: number; // +1, -1, или -3
}

export default function ClothesConveyor({
  items,
  speed = 1.2,
  onPick,
}: {
  items: ClothesItem[];
  speed?: number; // px per frame
  onPick: (item: ClothesItem) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Анимация движения
  useEffect(() => {
    let x = 0;

    const tick = () => {
      if (trackRef.current) {
        x -= speed;
        if (x < -trackRef.current.scrollWidth / 2) {
          x = 0;
        }
        trackRef.current.style.transform = `translateX(${x}px)`;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [speed, items]);

  // Дублируем items → items для бесконечной ленты
  const doubled = [...items, ...items];

  return (
    <div
      style={{
        width: "100%",
        height: "140px",
        overflow: "hidden",
        position: "relative",
        background: "rgba(0,0,0,0.25)",
        borderTop: "3px solid rgba(255,255,255,0.2)",
      }}
    >
      {/* лента */}
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: "20px",
          padding: "20px",
          position: "absolute",
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        {doubled.map((item) => (
          <img
            key={item.id + Math.random()} // уникальный ключ
            src={item.img}
            onClick={() => {
              const cleanId = item.id.replace(/-dressed$/, "");
              onPick({ ...item, id: cleanId });
            }}
            style={{
              height: "90px",
              width: "auto",
              cursor: "pointer",
              userSelect: "none",
              filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLImageElement).style.transform =
                "scale(1.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLImageElement).style.transform =
                "scale(1)";
            }}
          />
        ))}
      </div>
    </div>
  );
}