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

  // Ref for sticky slow_down effect
  const slowDownUntilRef = useRef<number>(0);

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

  // ───────── OBSTACLE COLLISION TUNING ─────────
  const OBSTACLE_WARNING_RADIUS = 120;

  // ───────────────────────── Obstacles ↔ Road constraints ─────────────────────────
  const blockedSegments = snowDriftControllerRef.current
    ? snowDriftControllerRef.current.getSegments().map((s) => ({
        fromX: s.fromX,
        toX: s.toX,
        blocksLane: s.blocksLane,
      }))
    : [];
    
  const sledWorldX = scrollXRef.current + stageWidthRef.current * 0.3;

  const OBSTACLE_SPAWN_OFFSET_X = 300;

  const obstacles = useObstacles(
    sledWorldX + OBSTACLE_SPAWN_OFFSET_X,
    stageWidth,
    stageHeight,
    blockedSegments
  );
  const obstaclesRef = useRef<any[]>([]);
  useEffect(() => {
    obstaclesRef.current = obstacles as any[];
  }, [obstacles]);

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
      // логируем ВСЕ нажатия для отладки
      // (console.log("[KEY]", e.key, "isRunning:", isRunningRef.current);) // Optionally keep or remove

      // предотвращаем скролл страницы стрелками
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
      }

      // ───── Вертикальное управление (ВСЕГДА активно) ─────
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        setSledStep((s) => Math.max(0, s - 1));
      }

      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        setSledStep((s) => Math.min(ROAD_STEPS, s + 1));
      }

      // ───── Остальная логика ТОЛЬКО при запущенной игре ─────
      if (!isRunningRef.current) return;

      // ускорение
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        const now = performance.now();
        setBoostUntilTs(now + BOOST_DURATION_MS);
      }

      // стоп
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

      if (lastTimeRef.current == null) {
        lastTimeRef.current = t;
        return;
      }

      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      if (!isRunningRef.current) return;

      // ───────── EASING / HIT ZONE LOGIC ─────────
      let inEasingZone = true;
      let inHitZone = true;
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
        const sledX = worldX + stageWidthRef.current * 0.2;

        const easingStart = activeSeg.fromX + EASING_ZONE_OFFSET_X;
        const easingEnd = easingStart + EASING_ZONE_WIDTH;

        const hitStart = activeSeg.fromX + HIT_ZONE_OFFSET_X;
        const hitEnd = hitStart + HIT_ZONE_WIDTH;

        inEasingZone = sledX >= easingStart && sledX <= easingEnd;
        inHitZone = sledX >= hitStart && sledX <= hitEnd;
      }

      // ───────── SLED WORLD POSITION ─────────
      const sledWorldX = scrollXRef.current + stageWidthRef.current * 0.3;
      const sledLane: "upper" | "lower" =
        sledStep <= ROAD_STEPS / 2 ? "upper" : "lower";

      // ───────── OBSTACLE COLLISION STATE (single obstacle) ─────────
      let obstacleHit = false;
      let nextObstacle: any = null;

      const sledCollisionX = sledWorldX;
      const liveObstacles = obstaclesRef.current;

      // берём ТОЛЬКО ближайшее препятствие впереди
      nextObstacle = liveObstacles
        .filter((o) => {
          if (o.passed) return false;
          if (o.type === "snowdrift") return false;
          if (o.x < sledWorldX - 10) return false;

          const obstacleStep = o.lane === "upper" ? 0 : ROAD_STEPS;
          return Math.abs(sledStep - obstacleStep) <= 2;
        })
        .sort((a, b) => a.x - b.x)[0];

      if (nextObstacle) {
        const dx = nextObstacle.x - sledCollisionX;
        const hitDistance = nextObstacle.definition.hitRadius + 60;

        // замедление при приближении
        if (dx > 0 && dx < OBSTACLE_WARNING_RADIUS) {
          slowDownUntilRef.current = performance.now() + 400;
        }

        // столкновение
        if (Math.abs(dx) <= hitDistance) {
          obstacleHit = true;
          nextObstacle.passed = true;
        }

        // полностью пройдено
        if (dx < -hitDistance) {
          nextObstacle.passed = true;
        }
      }


      // ───────── Scroll update ─────────
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

      // ───────── Sled state update ─────────
      if (obstacleHit) {
        nextSledState = "crash";
      } else if (performance.now() < slowDownUntilRef.current || inEasingZone) {
        nextSledState = "slow_down";
      } else {
        nextSledState = isBoosting ? "run_fast" : "run_fast";
      }

      setSledState((prev) => (prev !== nextSledState ? nextSledState : prev));
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);


  useEffect(() => {
    if (!isRunning) {
      resetSnowDrifts();
      return;
    }

    ensureSnowDriftController();
    activeSnowDriftIdRef.current = null;
  }, [isRunning]);

  /* ───────────────────────── UI ───────────────────────── */

  // ───────── DRIVE BAND ─────────
  const roadHeight = baseLowerLimit - baseUpperLimit;

  const BUFFER_Y = 30;
  const DRIVE_BAND_HEIGHT = Math.max(0, roadHeight - BUFFER_Y * 2);

  const ROAD_STEPS_SAFE = Math.max(1, ROAD_STEPS);
  const stepSize = DRIVE_BAND_HEIGHT / ROAD_STEPS_SAFE;

  const targetSledY = Math.min(
    DRIVE_BAND_HEIGHT,
    Math.max(0, sledStep * stepSize)
  );

  return (
    <div className="dog-sled-run-stage" ref={stageRef}>
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

            // мировая Y координата obstacle (1 раз определяем)

            const top = obstacle.y;

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

        {/* SnowDrift visuals */}
        {snowDriftControllerRef.current &&
          snowDriftControllerRef.current
            .getSegments()
            .map((segment) => (
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
            pointerEvents: "none",
            zIndex: 40,
          }}
        >
          {/* верхний буфер */}
          <div
            className="road-buffer road-buffer-top"
            style={{
              height: 20,
              pointerEvents: "none",
            }}
          />

          {/* полоса движения */}
          <div
            className="road-drive-band"
            style={{
              position: "relative",
              height: "calc(100% - 40px)", // 20px top + 20px bottom
            }}
          >
            <DogSled y={targetSledY} state={sledState} />
          </div>

          {/* нижний буфер */}
          <div
            className="road-buffer road-buffer-bottom"
            style={{
              height: 20,
              pointerEvents: "none",
            }}
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
