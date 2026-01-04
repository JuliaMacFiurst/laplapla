"use client";

import { useEffect, useRef, useState } from "react";
import { BACKGROUND_LAYERS } from "./background/backgroundLayers";
import { useObstacles } from "./track/useObstacles";
import { SnowDriftController } from "./SnowdriftController";
import SnowDriftVisual from "./track/SnowDriftVisual";

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

  const scrollXRef = useRef(0);
  const stageWidthRef = useRef(1200);

  const [phase, setPhase] = useState<Phase>("ready");
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(isRunning);
  const [lane, setLane] = useState<Lane>("lower");

  // логические координаты упряжки
  const [sledY, setSledY] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  // базовые параметры (позже придут из подготовки)
  const [stageWidth, setStageWidth] = useState(1200);
  const [stageHeight, setStageHeight] = useState(800);

  // laneYRef для хранения нормализованных координат полос
  const laneYRef = useRef({ upper: 0, lower: 0 });

  // ───────────────────────── SnowDriftController (логика обочин) ─────────────────────────
  const snowDriftControllerRef = useRef<SnowDriftController | null>(null);
  const activeSnowDriftIdRef = useRef<string | null>(null);

  const ensureSnowDriftController = () => {
    if (snowDriftControllerRef.current) return;

    const w = stageWidthRef.current || 1200;
    snowDriftControllerRef.current = new SnowDriftController({
      // примерно раз в 4–6 секунд при speed=300: 1200–1800px
      minGapX: 1400,
      // длина сегмента: подстраиваемся под ширину окна, но в разумных пределах
      minLength: Math.max(420, w * 0.55),
      maxLength: Math.max(560, w * 0.75),
      offsetY: snowbankOffset,
    });
  };

  const resetSnowDrifts = () => {
    snowDriftControllerRef.current = null;
    activeSnowDriftIdRef.current = null;
  };

  // Параметры коридора движения
  const [baseUpperLimit, setBaseUpperLimit] = useState(0);
  const [baseLowerLimit, setBaseLowerLimit] = useState(0);
  const snowbankOffset = 120;

  // базовая скорость заезда (px/second)
  const speed = 300;

  // ───────────────────────── Obstacles ↔ Road constraints ─────────────────────────
  const blockedSegments = snowDriftControllerRef.current
    ? snowDriftControllerRef.current
        .getSegments()
        .map((s) => ({
          fromX: s.fromX,
          toX: s.toX,
          blocksLane: s.blocksLane,
        }))
    : [];

  const obstacles = useObstacles(scrollX, stageWidth, blockedSegments);

  useEffect(() => {
    if (!stageRef.current) return;

    const update = () => {
      const w = stageRef.current!.clientWidth;
      const h = stageRef.current!.clientHeight;
      stageWidthRef.current = w;
      setStageWidth(w);
      setStageHeight(h);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    laneYRef.current.upper = stageHeight * 0.66;
    laneYRef.current.lower = stageHeight * 0.8;

    setBaseUpperLimit(laneYRef.current.upper - 80);
    setBaseLowerLimit(laneYRef.current.lower + 80);
  }, [stageHeight]);

  // New constants for snowbank visual positioning

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  /* ───────────────────────── INPUT ───────────────────────── */

  // Обработчик остановки вынесен выше для доступности в useEffect
  function handleStop() {
    setIsRunning(false);
    setPhase("ready");
    lastTimeRef.current = null;
    resetSnowDrifts();
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
    function clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    }

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
        scrollXRef.current = newX;
        return newX;
      });

      // ───────────── SnowDriftController update (world-space) ─────────────
      ensureSnowDriftController();

      const controller = snowDriftControllerRef.current!;
      const worldX = scrollXRef.current;
      const spawnUntilX = worldX + stageWidthRef.current * 2;

      controller.update(worldX, spawnUntilX);

      // Берём первый сегмент, который пересекает видимую область (можно будет улучшить позже)
      const viewLeft = worldX;
      const viewRight = worldX + stageWidthRef.current;

      const activeSeg = controller
        .getSegments()
        .find((s) => s.toX >= viewLeft && s.fromX <= viewRight);

      if (!activeSeg) {
        if (activeSnowDriftIdRef.current !== null) {
          activeSnowDriftIdRef.current = null;
        }
      } else if (activeSeg.id !== activeSnowDriftIdRef.current) {
        // Активный сегмент сменился (или появился впервые)
        activeSnowDriftIdRef.current = activeSeg.id;
      
      }

      // плавное стремление к нужной полосе (без логики сужения дороги)
      const targetY =
        lane === "upper" ? laneYRef.current.upper : laneYRef.current.lower;

      setSledY((y) => {
        const nextY = y + (targetY - y) * 0.12;
        return clamp(nextY, baseUpperLimit, baseLowerLimit);
      });
    }

    requestAnimationFrame(loop);
  }, [lane, stageWidth, baseUpperLimit, baseLowerLimit, snowbankOffset]);

  useEffect(() => {
    if (!isRunning) {
      resetSnowDrifts();
      return;
    }

    // старт заезда: создаём контроллер (лениво) и сбрасываем активный сегмент
    ensureSnowDriftController();
    activeSnowDriftIdRef.current = null;
  }, [isRunning]);

  /* ───────────────────────── UI ───────────────────────── */

  return (
    <div className="dog-sled-run-stage" ref={stageRef}>
      {/* SCENE */}
      <div
        className="dog-sled-run-scene"
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
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

        <div
          className="dog-sled-obstacles"
          style={{ position: "absolute", inset: 0 }}
        >
          {obstacles.map((obstacle) => {
            const left = obstacle.x - scrollX;
            if (left < -200) return null;
            const laneY =
              obstacle.lane === "upper"
                ? laneYRef.current.upper
                : laneYRef.current.lower;
            const top = obstacle.y !== undefined ? obstacle.y : laneY;
            return (
              <div
                key={obstacle.id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  left: left,
                  top: top,
                  transform: "translate(-50%, -50%)",
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
        </div>

        {/* DEBUG: corridor */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: baseUpperLimit,
            height: baseLowerLimit - baseUpperLimit,
            background: "rgba(0, 255, 0, 0.08)",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />

        {/* DEBUG: upper clamp */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: baseUpperLimit,
            height: 2,
            background: "lime",
            zIndex: 6,
          }}
        />

        {/* DEBUG: lower clamp */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: baseLowerLimit,
            height: 2,
            background: "red",
            zIndex: 6,
          }}
        />

        {/* ───────────────────────── SnowDrift visuals (from controller) ───────────────────────── */}
        {snowDriftControllerRef.current &&
          snowDriftControllerRef.current.getSegments().map((segment) => (
            <SnowDriftVisual
              key={segment.id}
              segment={segment}
              scrollX={scrollX}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
              baseUpperLimit={baseUpperLimit}
              baseLowerLimit={baseLowerLimit}
              debug
            />
          ))}

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
