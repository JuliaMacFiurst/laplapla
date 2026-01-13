"use client";

import { useEffect, useRef, useState } from "react";
import DogSled, { DogSledState } from "./track/DogSled";
import { BACKGROUND_LAYERS } from "./background/backgroundLayers";
import { useObstacles } from "./track/useObstacles";
import { useBonusStars, BonusStar } from "./track/useBonusStars";
import { buildSledRunConfig, PreparationResult } from "./track/useSledRunConfig";
import { SnowDriftController } from "./SnowdriftController";
import SnowDriftVisual from "./track/SnowDriftVisual";
import FinishLine from "./FinishLine";
import RunResultsOverlay from "./RunResultsOverlay";

type Phase = "ready" | "running" | "crash" | "finish";

const STAR_SPAWN_OFFSET_X = 400;
const STAR_COLLECTION_DISTANCE = 220;
const STAR_LANE_TOLERANCE = 2;
const FINISH_DELAY_SECONDS = 90;
const FINISH_SLOW_DURATION_MS = 1800;

export interface DogSledRunStageProps {
  prep: PreparationResult;
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
export default function DogSledRunStage({
  prep,
  onExit,
}: DogSledRunStageProps) { 
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


  const [scrollX, setScrollX] = useState(0);
  const [sledState, setSledState] = useState<DogSledState>("run_fast");
  const [collectedStars, setCollectedStars] = useState(0);
  const [crashCount, setCrashCount] = useState(0);
  const [finishX, setFinishX] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // ───────────────────────── Управление санями ─────────────────────────
  const [boostUntilTs, setBoostUntilTs] = useState<number | null>(null);
  const BOOST_DURATION_MS = 3000;

  // refs to keep loop in sync with latest state (avoid stale closure)
  const sledStepRef = useRef(sledStep);
  const sledStateRef = useRef<DogSledState>(sledState);
  const boostUntilTsRef = useRef<number | null>(boostUntilTs);
  const lastDecisionRef = useRef<string>("");
  const phaseRef = useRef<Phase>("ready");
  const finishXRef = useRef(0);
  const finishSlowStartRef = useRef<number | null>(null);
  const finishSlowCompleteRef = useRef(false);

  useEffect(() => {
    sledStepRef.current = sledStep;
  }, [sledStep]);

  useEffect(() => {
    sledStateRef.current = sledState;
  }, [sledState]);

  useEffect(() => {
    boostUntilTsRef.current = boostUntilTs;
  }, [boostUntilTs]);

  const sledConfig = buildSledRunConfig(prep);
  const speed = sledConfig.baseSpeed;

  useEffect(() => {
    phaseRef.current = phase;

    if (phase === "running") {
      const targetFinish =
        scrollXRef.current + speed * FINISH_DELAY_SECONDS;
      finishXRef.current = targetFinish;
      setFinishX(targetFinish);
      finishSlowStartRef.current = null;
      finishSlowCompleteRef.current = false;
      setShowResults(false);
    } else if (phase === "ready") {
      finishXRef.current = 0;
      setFinishX(0);
      finishSlowStartRef.current = null;
      finishSlowCompleteRef.current = false;
      setShowResults(false);
    }
  }, [phase, speed]);

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

  // ───────────────────────── SnowDrift interaction tuning ─────────────────────────
  const EASING_ZONE_WIDTH = 180;
  const EASING_ZONE_OFFSET_X = 40;

  const EASING_SPEED_MULT = 0.65;

  // ───────── OBSTACLE COLLISION TUNING ─────────
  // const OBSTACLE_WARNING_RADIUS = 120; // removed: no longer used

  // ───────── OBSTACLE SEQUENCE TIMING ─────────
  const HOOKED_DURATION_MS = 800;
  const CRASH_DURATION_MS = 1000;
  const RECOVER_DURATION_MS = 1000;
  const obstacleSequenceUntilRef = useRef<number>(0);
  const obstacleSequenceStateRef = useRef<DogSledState | null>(null);
  const collectedStarIdsRef = useRef<Set<string>>(new Set());

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
  const [bonusStars, collectBonusStar] = useBonusStars(
    sledWorldX + STAR_SPAWN_OFFSET_X,
    stageWidth,
    stageHeight,
    1,
    blockedSegments
  );
  const bonusStarsRef = useRef<BonusStar[]>([]);
  useEffect(() => {
    bonusStarsRef.current = bonusStars;
  }, [bonusStars]);

  const obstacles = useObstacles(
    sledWorldX + OBSTACLE_SPAWN_OFFSET_X,
    stageWidth,
    stageHeight,
    sledConfig.obstacleRateMultiplier,
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
    phaseRef.current = "ready";
    setPhase("ready");
    lastTimeRef.current = null;
    resetSnowDrifts();
    boostUntilTsRef.current = null;
    setBoostUntilTs(null);
    setCollectedStars(0);
    setCrashCount(0);
    setShowResults(false);
    finishXRef.current = 0;
    setFinishX(0);
  }

  function startRun() {
    boostUntilTsRef.current = null;
    setBoostUntilTs(null);
    setCollectedStars(0);
    setCrashCount(0);
    setShowResults(false);
    phaseRef.current = "running";
    setPhase("running");
    setIsRunning(true);
    setSledStep(ROAD_STEPS);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {

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
        const until = now + BOOST_DURATION_MS;
        boostUntilTsRef.current = until;
        setBoostUntilTs(until);
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

      const currentPhaseInitial = phaseRef.current;
      let currentPhase = currentPhaseInitial;
      let isRunningPhase = currentPhase === "running";
      let isFinishing = currentPhase === "finish";

      let inEasingZone = false;
      let nextSledState: DogSledState = sledState;

      const sledWorldX = scrollXRef.current + stageWidthRef.current * 0.3;
      const currentSledStep = sledStepRef.current;

      if (isRunningPhase) {
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

          inEasingZone = sledX >= easingStart && sledX <= easingEnd;
        }

        let obstacleHit = false;
        let nextObstacle: any = null;

        const sledCollisionX = sledWorldX;
        const liveObstacles = obstaclesRef.current;

        nextObstacle = liveObstacles
          .filter((o) => {
            if (!o) return false;
            if (o.passed) return false;
            if (o.type === "snowdrift") return false;
            if (o.x < sledWorldX - 40) return false;

            const obstacleStep = o.lane === "upper" ? 0 : ROAD_STEPS;
            return Math.abs(currentSledStep - obstacleStep) <= 2;
          })
          .sort((a, b) => a.x - b.x)[0];

        if (nextObstacle) {
          const dx = nextObstacle.x - sledCollisionX;
          const hitRadius = Number(nextObstacle?.definition?.hitRadius ?? 0);
          const noseOffset = 300;
          const hitDistance = hitRadius + noseOffset;

          if (Math.abs(dx) <= hitDistance) {
            obstacleHit = true;
          }

          if (dx < -hitDistance) {
            nextObstacle.passed = true;
          }
        }

        collectedStarIdsRef.current.clear();
        for (const star of bonusStarsRef.current) {
          if (collectedStarIdsRef.current.has(star.id)) {
            continue;
          }

          const dx = star.x - sledCollisionX;
          if (dx < -120 || dx > STAR_COLLECTION_DISTANCE) continue;

          const starStep = star.lane === "upper" ? 0 : ROAD_STEPS;
          if (Math.abs(currentSledStep - starStep) > STAR_LANE_TOLERANCE) continue;

          collectedStarIdsRef.current.add(star.id);
          collectBonusStar(star.id);
          setCollectedStars((count) => count + 1);
        }

        if (
          sledConfig.riskBoostChance > 0 &&
          !boostUntilTsRef.current &&
          Math.random() < sledConfig.riskBoostChance
        ) {
          const nowTs = performance.now();
          const duration = 300 + Math.random() * 300;
          const until = nowTs + duration;

          boostUntilTsRef.current = until;
          setBoostUntilTs(until);
        }

        if (finishXRef.current > 0 && sledWorldX >= finishXRef.current) {
          currentPhase = "finish";
          isRunningPhase = false;
          isFinishing = true;
          finishSlowStartRef.current = null;
          finishSlowCompleteRef.current = false;
          setShowResults(false);
          phaseRef.current = "finish";
          setPhase("finish");
        }

        const shouldSlow = inEasingZone;

        if (
          obstacleHit &&
          nextObstacle &&
          !nextObstacle.passed &&
          !obstacleSequenceStateRef.current
        ) {
          nextObstacle.passed = true;
          obstacleSequenceStateRef.current = "hooked";
          obstacleSequenceUntilRef.current = performance.now() + HOOKED_DURATION_MS;
        }

        if (obstacleSequenceStateRef.current) {
          const now = performance.now();
          if (now < obstacleSequenceUntilRef.current) {
            nextSledState = obstacleSequenceStateRef.current;
          } else {
            if (obstacleSequenceStateRef.current === "hooked") {
              obstacleSequenceStateRef.current = "crash";
              obstacleSequenceUntilRef.current = now + CRASH_DURATION_MS;
              nextSledState = "crash";
              setCrashCount((count) => count + 1);
            } else if (obstacleSequenceStateRef.current === "crash") {
              obstacleSequenceStateRef.current = "recover";
              obstacleSequenceUntilRef.current = now + RECOVER_DURATION_MS;
              nextSledState = "recover";
            } else {
              obstacleSequenceStateRef.current = null;
              nextSledState = "run_fast";
            }
          }
        } else if (shouldSlow) {
          nextSledState = "slow_down";
        } else {
          nextSledState = sledConfig.runStyle;
        }
      }

      const now = performance.now();
      const boostUntil = boostUntilTsRef.current;
      const isBoosting = boostUntil !== null && now < boostUntil;

      let effectiveSpeed = speed;
      if (isFinishing) {
        if (finishSlowStartRef.current === null) {
          finishSlowStartRef.current = now;
        }

        const elapsed = Math.min(
          FINISH_SLOW_DURATION_MS,
          now - (finishSlowStartRef.current ?? now)
        );
        const progress = Math.min(1, elapsed / FINISH_SLOW_DURATION_MS);
        const finishFactor = Math.max(0, 1 - progress);

        effectiveSpeed = speed * finishFactor;

        if (progress >= 1 && !finishSlowCompleteRef.current) {
          finishSlowCompleteRef.current = true;
          setIsRunning(false);
          setShowResults(true);
        }
      } else if (inEasingZone) {
        effectiveSpeed = speed * EASING_SPEED_MULT;
      } else if (isBoosting) {
        effectiveSpeed = speed * 1.6;
      }

      if (boostUntil !== null && now >= boostUntil) {
        boostUntilTsRef.current = null;
        setBoostUntilTs(null);
      }

      setScrollX((x) => {
        const targetX = x + effectiveSpeed * dt;
        const smoothedX = x + (targetX - x) * 0.85;
        scrollXRef.current = smoothedX;
        return smoothedX;
      });

      const prevState = sledStateRef.current;
      if (isFinishing) {
        nextSledState = "slow_down";
      } else if (!isRunningPhase) {
        nextSledState = sledConfig.runStyle;
      }

      const decisionKey = `${prevState}->${nextSledState}|phase=${currentPhase}`;
      if (decisionKey !== lastDecisionRef.current) {
        lastDecisionRef.current = decisionKey;
      }

      if (prevState !== nextSledState) {
        sledStateRef.current = nextSledState;
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
              </div>
            );
          })}
        </div>

        {finishX > 0 && (
          <FinishLine
            finishX={finishX}
            scrollX={scrollX}
            stageWidth={stageWidth}
          />
        )}

        <div className="dog-sled-stars">
          {bonusStars.map((star) => {
            const left = star.x - scrollX;
            if (left < -200) return null;

            return (
              <div
                key={star.id}
                className="dog-sled-star"
                style={{
                  position: "absolute",
                  left,
                  top: star.y,
                }}
              />
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
            //background: "rgba(0, 255, 0, 0.08)",
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
            //background: "lime",
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
            //background: "red",
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
          <button onClick={startRun}>Начать заезд</button>

          {onExit && <button onClick={onExit}>← Назад</button>}
        </div>
      )}

      {phase === "running" && (
        <div className="dog-sled-hud">
          <div className="dog-sled-star-counter">
            <span className="dog-sled-star-icon" aria-hidden="true">
              ⭐
            </span>
            <span className="dog-sled-star-value">{collectedStars}</span>
          </div>
          <button className="dog-sled-stop-btn" onClick={handleStop}>
            Стоп
          </button>
        </div>
      )}

      {phase === "finish" && showResults && (
        <RunResultsOverlay
          stars={collectedStars}
          crashes={crashCount}
          onRetry={startRun}
          onExit={onExit}
        />
      )}
    </div>
  );
}
