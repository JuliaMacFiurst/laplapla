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
}: {
  items: ClothesItem[];
  speed?: number; // px per frame
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
  <div className="clothes-conveyor">
    <div ref={trackRef} className="clothes-conveyor-track">
      {doubled.map((item, index) => (
        <img
          key={`${item.id}-${index}`}
          src={item.img}
          draggable
          className="conveyor-item"
          onDragStart={(e) => {
            const cleanId = item.id.replace(/-dressed$/, "");
            e.dataTransfer.setData("text/plain", cleanId);
            e.dataTransfer.effectAllowed = "move";
            e.currentTarget.classList.add("dragging");
          }}
          onDragEnd={(e) => {
            e.currentTarget.classList.remove("dragging");
          }}
        />
      ))}
    </div>
  </div>
);}