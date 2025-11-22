"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";

interface SteeringYokeProps {
  onAngleChange: (angle: number, pushPull: number) => void;
}

export default function SteeringYoke({ onAngleChange }: SteeringYokeProps) {
  const yokeRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [pushPull, setPushPull] = useState(0);
  const [shake, setShake] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    onAngleChange(angle, pushPull);
  }, [angle, pushPull, onAngleChange]);

  function onPointerDown(e: React.PointerEvent) {
    setActive(true);
    const el = yokeRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    function onPointerMove(ev: PointerEvent) {
      const dx = ev.clientX - centerX;
      const dy = ev.clientY - centerY;

      let newAngle = dx * 0.25;
      newAngle = Math.max(-35, Math.min(newAngle, 35));

      let newPushPull = dy * -0.05;
      newPushPull = Math.max(-10, Math.min(newPushPull, 10));

      setAngle(newAngle);
      setPushPull(newPushPull);

      const rapidMove = Math.abs(dx) > 30 ? (Math.random() * 4 - 2) : 0;
      setShake(rapidMove);
    }

    function onPointerUp() {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);

      setActive(false);
      setAngle(0);
      setPushPull(0);
      setShake(0);
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  return (
    <div
      ref={yokeRef}
      className={`yoke ${active ? "yoke-active" : "yoke-inactive"}`}
      style={{
        transform: `
          translateX(-50%)
          translateX(${shake}px)
          rotate(${angle}deg)
          translateY(${pushPull}px)
        `,
        transition: shake === 0 ? "transform 0.15s ease-out" : "none",
        pointerEvents: "none"
      }}
    >
      <div className="yoke-handle" onPointerDown={onPointerDown} />
      <Image
        className="yoke-img"
        src="/quests/assets/decorations/plane-yoke.svg"
        alt="plane yoke"
        fill
        style={{ objectFit: "contain", pointerEvents: "none" }}
      />
    </div>
  );
}
