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
  onItemReleased,
}: {
  items: ClothesItem[];
  speed?: number; // px per frame
  onItemReleased?: (id: string, x: number, y: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const draggingItemRef = useRef<{
    id: string;
    el: HTMLImageElement;
  } | null>(null);

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

  const finishDrag = (x?: number, y?: number) => {
    if (!draggingItemRef.current) return;

    const { id, el } = draggingItemRef.current;

    el.classList.remove("dragging");
    el.style.position = "";
    el.style.left = "";
    el.style.top = "";
    el.style.pointerEvents = "";
    el.style.zIndex = "";

    if (typeof x === "number" && typeof y === "number") {
      onItemReleased?.(id, x, y);
    }

    draggingItemRef.current = null;
  };

  return (
  <div className="clothes-conveyor">
    <div ref={trackRef} className="clothes-conveyor-track">
      {doubled.map((item, index) => (
        <img
          key={`${item.id}-${index}`}
          src={item.img}
          className="conveyor-item"
          onPointerDown={(e) => {
            const cleanId = item.id.replace(/-dressed$/, "");

            draggingItemRef.current = {
              id: cleanId,
              el: e.currentTarget,
            };

            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.classList.add("dragging");
          }}
          onPointerMove={(e) => {
            if (!draggingItemRef.current) return;

            const el = draggingItemRef.current.el;

            el.style.position = "fixed";
            el.style.left = `${e.clientX - el.width / 2}px`;
            el.style.top = `${e.clientY - el.height / 2}px`;
            el.style.pointerEvents = "none";
            el.style.zIndex = "9999";
          }}
          onPointerUp={(e) => {
            finishDrag(e.clientX, e.clientY);
          }}
          onPointerCancel={() => {
            finishDrag();
          }}
        />
      ))}
    </div>
  </div>
);}