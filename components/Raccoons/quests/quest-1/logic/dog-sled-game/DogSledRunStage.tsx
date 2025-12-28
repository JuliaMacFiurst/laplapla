"use client";

import React, { useEffect, useRef, useState } from "react";
import { BACKGROUND_LAYERS } from "./background/backgroundLayers";
import { useObstacles } from "./track/useObstacles";
import { OBSTACLES } from "./track/obstacles";
import { SNOWDRIFT_VARIANTS } from "./track/obstacles";

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
  const upperLaneY = 290;
  const lowerLaneY = 380;

  const [stageWidth, setStageWidth] = useState(1200);

  const obstacles = useObstacles();

  // Новое состояние для сугроба
  const [activeSnowbank, setActiveSnowbank] = useState<
    "upper" | "lower" | null
  >(null);
  const activeSnowbankRef = useRef<"upper" | "lower" | null>(null);

  // Параметры коридора движения
  const baseUpperLimit = upperLaneY - 80;
  const baseLowerLimit = lowerLaneY + 80;
  const snowbankOffset = 120;

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

  useEffect(() => {
    activeSnowbankRef.current = activeSnowbank;
  }, [activeSnowbank]);

  /* ───────────────────────── INPUT ───────────────────────── */

  // Обработчик остановки вынесен выше для доступности в useEffect
  function handleStop() {
    setIsRunning(false);
    setPhase("ready");
    lastTimeRef.current = null;
    setActiveSnowbank(null);
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
    function loop(t: number) {
      requestAnimationFrame(loop);

      if (!isRunningRef.current) {
        lastTimeRef.current = t;
        return;
      }

      if (lastTimeRef.current == null) {
        lastTimeRef.current = t;
        return;
      }

      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      // движение мира влево
      setScrollX((x) => {
        const newX = x + speed * dt;
        return newX;
      });

      // плавное стремление к нужной полосе
      const targetY = lane === "upper" ? upperLaneY : lowerLaneY;

      // Вычисление ограничений по Y в зависимости от activeSnowbank
      let minAllowedY = baseUpperLimit;
      let maxAllowedY = baseLowerLimit;
      if (activeSnowbankRef.current === "upper") {
        minAllowedY = baseUpperLimit + snowbankOffset;
        maxAllowedY = baseLowerLimit;
      } else if (activeSnowbankRef.current === "lower") {
        minAllowedY = baseUpperLimit;
        maxAllowedY = baseLowerLimit - snowbankOffset;
      }

      // Функция clamp
      function clamp(value: number, min: number, max: number) {
        return Math.min(Math.max(value, min), max);
      }

      setSledY((y) => {
        const nextY = y + (targetY - y) * 0.12;
        return clamp(nextY, minAllowedY, maxAllowedY);
      });
    }

    requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      setActiveSnowbank(null);
      return;
    }

    let hideTimer: number;
    let interval: number;

    function spawnSnowbank() {
      const side: "upper" | "lower" = Math.random() < 0.5 ? "upper" : "lower";
      setActiveSnowbank(side);

      hideTimer = window.setTimeout(() => {
        setActiveSnowbank(null);
      }, 2500);
    }

    spawnSnowbank();
    interval = window.setInterval(spawnSnowbank, 4000 + Math.random() * 2000);

    return () => {
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [isRunning]);

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
                transform: `translateX(-${
                  (scrollX * layer.speedMultiplier) % stageWidth
                }px)`,
                zIndex: layer.zIndex,
              }}
            />
          ))}
        </div>

        <div className="dog-sled-obstacles">
          {obstacles.map((obstacle) => {
            const laneY = obstacle.lane === "upper" ? upperLaneY : lowerLaneY;
            return (
              <div
                key={obstacle.id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  left: obstacle.x - scrollX,
                  top: laneY,
                  transform: "translateX(-50%)",
                  backgroundImage: `url(${obstacle.definition.src})`,
                }}
              >
                <div
                  className="hitbox-debug"
                  style={{
                    width: obstacle.definition.hitRadius * 2,
                    height: obstacle.definition.hitRadius * 2,
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </div>
            );
          })}

          {/* Рендер большого сугроба */}
          {activeSnowbank === "upper" && (
            <div
              className="big-snowbank upper"
              style={{
                position: "absolute",
                left: stageWidth / 2,
                top: upperLaneY - 150,
                transform: "translate(-50%, -100%)",
                backgroundImage: `url(${SNOWDRIFT_VARIANTS.upper})`,
                width: 420,
                height: 420,
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
                zIndex: 1000,
              }}
            />
          )}
          {activeSnowbank === "lower" && (
            <div
              className="big-snowbank lower"
              style={{
                position: "absolute",
                left: stageWidth / 2,
                top: lowerLaneY,
                transform: "translate(-50%, -100%)",
                backgroundImage: `url(${SNOWDRIFT_VARIANTS.lower})`,
                width: 400,
                height: 400,
                backgroundRepeat: "no-repeat",
                backgroundSize: "contain",
                zIndex: 900,
              }}
            />
          )}
        </div>

        {/* SLED */}
        <div
          className="dog-sled-entity"
          style={{ transform: `translateY(${sledY}px)` }}
        >
          <div className="dog-sled-placeholder">🐕‍🦺🐕‍🦺🐕‍🦺</div>
        </div>
      </div>

      {/* OVERLAY UI */}
      {phase === "ready" && (
        <div className="dog-sled-run-overlay">
          <button
            onClick={() => {
              setPhase("running");
              setIsRunning(true);
            }}
          >
            Начать заезд
          </button>

          {onExit && <button onClick={onExit}>← Назад</button>}
        </div>
      )}
      {phase === "running" && (
        <div className="dog-sled-hud">
          <button className="dog-sled-stop-btn" onClick={handleStop}>
            Стоп
          </button>
        </div>
      )}
    </div>
  );
}
