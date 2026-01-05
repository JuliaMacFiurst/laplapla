"use client";

import { useEffect, useRef, useState } from "react";
import DogSled, { DogSledState } from "./track/DogSled";
import { BACKGROUND_LAYERS } from "./background/backgroundLayers";
import { useObstacles } from "./track/useObstacles";
import { SnowDriftController } from "./SnowdriftController";
import SnowDriftVisual from "./track/SnowDriftVisual";

type Phase = "ready" | "running" | "crash" | "finish";

export interface DogSledRunStageProps {
  onExit?: () => void;
}

/**
 * DogSledRunStage
 * ----------------
 * Корневой компонент этапа заезда.
 * Ответственность:
 * - сцена + game loop
 * - ввод игрока
 * - world scroll
 * - подключение контроллеров (snowdrift)
 * - рендер препятствий и дороги
 */
export default function DogSledRunStage({ onExit }: DogSledRunStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number | null>(null);

  const scrollXRef = useRef(0);
  const stageWidthRef = useRef(1200);

  const [phase, setPhase] = useState<Phase>("ready");
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(isRunning);

  // дискретное положение саней внутри дороги: 0 = верх, ROAD_STEPS = низ
  const ROAD_STEPS = 5;
  const [sledStep, setSledStep] = useState(ROAD_STEPS);
  const sledYRef = useRef<number>(0);

  const [scrollX, setScrollX] = useState(0);
  const [sledState, setSledState] = useState<DogSledState>("run_fast");

  // ───────────────────────── Управление санями ─────────────────────────
  const [boostUntilTs, setBoostUntilTs] = useState<number | null>(null);
  const BOOST_DURATION_MS = 3000;

  // базовые параметры (позже придут из подготовки)
  const [stageWidth, setStageWidth] = useState(1200);
  const [stageHeight, setStageHeight] = useState(800);

  // laneYRef для хранения координат полос
  const laneYRef = useRef({ upper: 0, lower: 0 });

  // ───────────────────────── SnowDriftController (логика обочин) ─────────────────────────
  const snowDriftControllerRef = useRef<SnowDriftController | null>(null);
  const activeSnowDriftIdRef = useRef<string | null>(null);

  // Параметры коридора движения (в world/screen координатах сцены)
  const [baseUpperLimit, setBaseUpperLimit] = useState(0);
  const [baseLowerLimit, setBaseLowerLimit] = useState(0);
  const snowbankOffset = 120;

  const ensureSnowDriftController = () => {
    if (snowDriftControllerRef.current) return;

    const w = stageWidthRef.current || 1200;
    snowDriftControllerRef.current = new SnowDriftController({
      minGapX: 1400,
      minLength: Math.max(420, w * 0.55),
      maxLength: Math.max(560, w * 0.75),
      offsetY: snowbankOffset,
    });
  };

  const resetSnowDrifts = () => {
    snowDriftControllerRef.current = null;
    activeSnowDriftIdRef.current = null;
  };

  // базовая скорость заезда (px/second)
  const speed = 300;

  // ───────────────────────── SnowDrift interaction tuning ─────────────────────────
  const EASING_ZONE_WIDTH = 180;
  const EASING_ZONE_OFFSET_X = 40;

  const HIT_ZONE_WIDTH = 140;
  const HIT_ZONE_OFFSET_X = 120;

  const EASING_SPEED_MULT = 0.65;

  // ───────────────────────── Obstacles ↔ Road constraints ─────────────────────────
  const blockedSegments = snowDriftControllerRef.current
    ? snowDriftControllerRef.current.getSegments().map((s) => ({
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

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  /* ───────────────────────── INPUT ───────────────────────── */

  function handleStop() {
    setIsRunning(false);
    setPhase("ready");
    lastTimeRef.current = null;
    resetSnowDrifts();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isRunningRef.current) return;

      // предотвращаем скролл страницы стрелками
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
      }

      // ───── Вертикальное управление ─────
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        setSledStep((s) => Math.max(0, s - 1));
      }
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        setSledStep((s) => Math.min(ROAD_STEPS, s + 1));
      }

      // ───── Ускорение ─────
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        const now = performance.now();
        setBoostUntilTs(now + BOOST_DURATION_MS);
      }

      // ───── Стоп ─────
      if (e.key === "Escape") {
        handleStop();
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───────────────────────── GAME LOOP ───────────────────────── */

  useEffect(() => {
    let rafId: number;

    const loop = (t: number) => {
      rafId = requestAnimationFrame(loop);

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

      // ───────── SLED Y SMOOTH MOVE ─────────
      const targetSledY = SLED_BUFFER_Y + sledStep * stepSize;
      if (sledYRef.current === 0) {
        sledYRef.current = targetSledY;
      } else {
        sledYRef.current += (targetSledY - sledYRef.current) * 0.18;
      }

      // ───────── EASING / HIT ZONE LOGIC ─────────
      let inEasingZone = false;
      let inHitZone = false;
      let nextSledState: DogSledState = sledState;

      ensureSnowDriftController();

      const controller = snowDriftControllerRef.current!;
      const worldX = scrollXRef.current;
      const spawnUntilX = worldX + stageWidthRef.current * 2;

      controller.update(worldX, spawnUntilX);

      const viewLeft = worldX;
      const viewRight = worldX + stageWidthRef.current;

      const activeSeg = controller
        .getSegments()
        .find((s) => s.toX >= viewLeft && s.fromX <= viewRight);

      if (activeSeg) {
        const sledX = worldX + stageWidthRef.current * 0.3;

        const easingStart = activeSeg.fromX + EASING_ZONE_OFFSET_X;
        const easingEnd = easingStart + EASING_ZONE_WIDTH;

        const hitStart = activeSeg.fromX + HIT_ZONE_OFFSET_X;
        const hitEnd = hitStart + HIT_ZONE_WIDTH;

        inEasingZone = sledX >= easingStart && sledX <= easingEnd;
        inHitZone = sledX >= hitStart && sledX <= hitEnd;
      }

      // ───────── Scroll update (через setState, но один loop) ─────────
      const now = performance.now();
      const isBoosting = boostUntilTs !== null && now < boostUntilTs;

      setScrollX((x) => {
        const effectiveSpeed = inEasingZone
          ? speed * EASING_SPEED_MULT
          : isBoosting
          ? speed * 1.6
          : speed;

        const targetX = x + effectiveSpeed * dt;
        const smoothedX = x + (targetX - x) * 0.85;
        scrollXRef.current = smoothedX;
        return smoothedX;
      });

      // ───────── Sled state update (ТОЛЬКО при изменении) ─────────
      if (inHitZone) {
        nextSledState = "crash";
      } else if (isBoosting) {
        nextSledState = "run_fast";
      } else if (inEasingZone) {
        nextSledState = "slow_down";
      } else {
        nextSledState = "run_tired";
      }

      setSledState((prev) => (prev !== nextSledState ? nextSledState : prev));
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []); // ⚠️ ПУСТОЙ dependency array

  useEffect(() => {
    if (!isRunning) {
      resetSnowDrifts();
      return;
    }

    ensureSnowDriftController();
    activeSnowDriftIdRef.current = null;
  }, [isRunning]);

  /* ───────────────────────── UI ───────────────────────── */

  // ЛОКАЛЬНАЯ координата внутри road-контейнера (0..roadHeight)
  const roadHeight = Math.max(0, baseLowerLimit - baseUpperLimit);

  // буфер безопасности, чтобы сани не обрезались краями дороги
  const SLED_BUFFER_Y = 25;

  // доступная высота движения саней
  const usableRoadHeight = Math.max(0, roadHeight - SLED_BUFFER_Y * 2);

  // шаг перемещения (в среднем 5 кликов от верха до низа)
  const stepSize = ROAD_STEPS > 0 ? usableRoadHeight / ROAD_STEPS : 0;

  // позиция саней внутри дороги с учётом буфера
  const targetSledY = SLED_BUFFER_Y + sledStep * stepSize;

  // локальные границы для DogSled (в координатах road)
  const sledClampTop = SLED_BUFFER_Y;
  const sledClampBottom = roadHeight - SLED_BUFFER_Y;

  return (
    <div className="dog-sled-run-stage" ref={stageRef}>
      <div className="dog-sled-run-scene" style={{ position: "relative", width: "100%", height: "100%" }}>
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

        <div className="dog-sled-obstacles" style={{ position: "absolute", inset: 0 }}>
          {obstacles.map((obstacle) => {
            const left = obstacle.x - scrollX;
            if (left < -200) return null;

            const laneY = obstacle.lane === "upper" ? laneYRef.current.upper : laneYRef.current.lower;
            const top = obstacle.y !== undefined ? obstacle.y : laneY;

            return (
              <div
                key={obstacle.id}
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  left,
                  top,
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

        {/* DEBUG corridor */}
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

        {/* DEBUG upper/lower */}
        <div style={{ position: "absolute", left: 0, right: 0, top: baseUpperLimit, height: 2, background: "lime", zIndex: 6 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: baseLowerLimit, height: 2, background: "red", zIndex: 6 }} />

        {/* SnowDrift visuals */}
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

        {/* Road container */}
        <div
          className="dog-sled-road"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: baseUpperLimit,
            height: baseLowerLimit - baseUpperLimit,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          <DogSled
            y={sledYRef.current}
            state={sledState}
            clampTop={sledClampTop}
            clampBottom={sledClampBottom}
          />
        </div>
      </div>

      {/* OVERLAY UI */}
      {phase === "ready" && (
        <div className="dog-sled-run-overlay">
          <button
            onClick={() => {
              setPhase("running");
              setIsRunning(true);
              setSledStep(ROAD_STEPS);
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
