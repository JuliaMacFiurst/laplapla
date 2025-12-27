"use client";

import React, { useEffect, useRef, useState } from "react";
import { TRACK_SEGMENTS } from "./track/trackSegments";
import { BACKGROUND_LAYERS } from "./background/backgroundLayers";

type Lane = "upper" | "lower";
type Phase = "ready" | "running" | "crash" | "finish";

export interface DogSledRunStageProps {
  onExit?: () => void;
}

/**
 * DogSledRunStage
 * ----------------
 * Корневой компонент этапа заезда.
 * Пока что:
 * – создаёт сцену
 * – принимает ввод (↑ / ↓)
 * – запускает game loop
 * – двигает «мир» влево
 */
export default function DogSledRunStage({ onExit }: DogSledRunStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(isRunning);
  const [lane, setLane] = useState<Lane>("lower");

  // логические координаты упряжки
  const [sledY, setSledY] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  // базовые параметры (позже придут из подготовки)
  const speed = 220; // px/sec
  const upperLaneY = 260;
  const lowerLaneY = 420;

  const [stageWidth, setStageWidth] = useState(1200);

useEffect(() => {
  if (!stageRef.current) return;

  const update = () => {
    setStageWidth(stageRef.current!.clientWidth);
  };

  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, []);

useEffect(() => {
  isRunningRef.current = isRunning;
}, [isRunning]);

  /* ───────────────────────── INPUT ───────────────────────── */

  // Обработчик остановки вынесен выше для доступности в useEffect
  function handleStop() {
    setIsRunning(false);
    setPhase("ready");
    lastTimeRef.current = null;
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isRunning) return;

      if (e.key === "ArrowUp") {
        setLane("upper");
      }
      if (e.key === "ArrowDown") {
        setLane("lower");
      }
      if (e.key === "Escape") {
        handleStop();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRunning]);

  /* ───────────────────────── GAME LOOP ───────────────────────── */

  useEffect(() => {
    if (!isRunning) return;

    function loop(t: number) {
      if (!isRunningRef.current) {
        lastTimeRef.current = null;
        return;
      }

      if (lastTimeRef.current == null) {
        lastTimeRef.current = t;
        requestAnimationFrame(loop);
        return;
      }

      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      // движение мира влево
      setScrollX((x) => x + speed * dt);

      // плавное стремление к нужной полосе
      const targetY = lane === "upper" ? upperLaneY : lowerLaneY;
      setSledY((y) => y + (targetY - y) * 0.12);

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    return () => {
      lastTimeRef.current = null;
    };
  }, [isRunning, lane]);

  /* ───────────────────────── UI ───────────────────────── */


  return (
    <div className="dog-sled-run-stage" ref={stageRef}>
      {/* SCENE */}
      <div className="dog-sled-run-scene">
        <div className="dog-sled-background">
          {BACKGROUND_LAYERS.map((layer) => (
            <div
              key={layer.id}
              className="dog-sled-background-layer"
              style={{
  backgroundImage: `url(${layer.src})`,
  transform: `translateX(-${(scrollX * layer.speedMultiplier) % stageWidth}px)`,
  zIndex: layer.zIndex,
}}
            />
          ))}
        </div>
        {/* WORLD LAYER (пока просто плейсхолдер) */}
        <div
          className="dog-sled-world"
          style={{ transform: `translateX(-${scrollX}px)` }}
        >
          {TRACK_SEGMENTS.map((seg, i) => {
            const left = TRACK_SEGMENTS
              .slice(0, i)
              .reduce((sum, s) => sum + s.widthScreens * stageWidth, 0);

            return (
              <img
                key={seg.id}
                src={seg.src}
                className="dog-sled-track-segment"
                style={{
                  left,
                  width: seg.widthScreens * stageWidth,
                }}
                draggable={false}
              />
            );
          })}
        </div>

        {/* SLED */}
        <div
          className="dog-sled-entity"
          style={{ transform: `translateY(${sledY}px)` }}
        >
          <div className="dog-sled-placeholder">
            🐕‍🦺🐕‍🦺🐕‍🦺
          </div>
        </div>
      </div>

      {/* OVERLAY UI */}
      {phase === "ready" && (
        <div className="dog-sled-run-overlay">
          <button onClick={() => {
            setPhase("running");
            setIsRunning(true);
          }}>
            Начать заезд
          </button>

          {onExit && (
            <button onClick={onExit}>
              ← Назад
            </button>
          )}
        </div>
      )}
      {phase === "running" && (
        <div className="dog-sled-hud">
          <button 
          className="dog-sled-stop-btn"
          onClick={handleStop}
          >Стоп
          </button>
        </div>
      )}
      
    </div>
  );
}