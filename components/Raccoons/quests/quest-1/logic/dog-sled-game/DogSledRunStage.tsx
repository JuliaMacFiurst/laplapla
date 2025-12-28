"use client";

import { useEffect, useRef, useState } from "react";
import { BACKGROUND_LAYERS } from "./background/backgroundLayers";
import { useObstacles } from "./track/useObstacles";
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

  // Параметры коридора движения
  const [baseUpperLimit, setBaseUpperLimit] = useState(0);
  const [baseLowerLimit, setBaseLowerLimit] = useState(0);
  const snowbankOffset = 120;

  // базовая скорость заезда (px/second)
  const speed = 300;

  const obstacles = useObstacles(scrollX, stageWidth);

  // Новое состояние для сугроба
  const [activeSnowbank, setActiveSnowbank] = useState<
    "upper" | "lower" | null
  >(null);
  const activeSnowbankRef = useRef<"upper" | "lower" | null>(null);

  // 1) Добавить bigSnowbank состояние и ref
  const [bigSnowbankX, setBigSnowbankX] = useState<number | null>(null);
  const bigSnowbankXRef = useRef<number | null>(null);

  // 2) Синхронизация ref с состоянием
  useEffect(() => {
    bigSnowbankXRef.current = bigSnowbankX;
  }, [bigSnowbankX]);

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
  const snowbankHeight = stageHeight * 0.35;

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

      // 3) Проверка выхода большого сугроба за экран
      if (bigSnowbankXRef.current !== null) {
        if (
          bigSnowbankXRef.current - scrollXRef.current + stageWidthRef.current <
          0
        ) {
          setActiveSnowbank(null);
          setBigSnowbankX(null);
        }
      }

      // плавное стремление к нужной полосе
      const targetY =
        lane === "upper" ? laneYRef.current.upper : laneYRef.current.lower;

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

      setSledY((y) => {
        const nextY = y + (targetY - y) * 0.12;
        return clamp(nextY, minAllowedY, maxAllowedY);
      });
    }

    requestAnimationFrame(loop);
  }, [lane, stageWidth, baseUpperLimit, baseLowerLimit, snowbankOffset]);

  useEffect(() => {
    if (!isRunning) {
      activeSnowbankRef.current = null;
      setActiveSnowbank(null);
      setBigSnowbankX(null);
      return;
    }
    let nextTimer: number | null = null;

    const spawnSnowbank = () => {
      if (activeSnowbankRef.current !== null) return;

      const side: "upper" | "lower" = Math.random() < 0.5 ? "upper" : "lower";

      activeSnowbankRef.current = side;
      setActiveSnowbank(side);
      // 4) Устанавливаем позицию большого сугроба
      setBigSnowbankX(scrollXRef.current + stageWidthRef.current);
    };

    const scheduleNext = (ms: number) => {
      if (nextTimer) window.clearTimeout(nextTimer);
      nextTimer = window.setTimeout(() => {
        if (!isRunningRef.current) return;

        // Try to spawn; if blocked, retry shortly until the current one clears.
        if (activeSnowbankRef.current === null) {
          spawnSnowbank();
          scheduleNext(4000 + Math.random() * 2000);
        } else {
          scheduleNext(350); // keep polling until it clears
        }
      }, ms);
    };

    // First spawn quickly after starting, then loop.
    scheduleNext(600);

    return () => {
      if (nextTimer) window.clearTimeout(nextTimer);
    };
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

        {/* 5) Позиционирование больших сугробов через left без transform */}
        {activeSnowbank === "upper" && bigSnowbankX !== null && (
          <div
            className="big-snowbank big-snowbank-upper"
            style={{
              position: "absolute",
              left: bigSnowbankX - scrollX,
              top: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url(${SNOWDRIFT_VARIANTS.upper})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "top center",
              backgroundSize: "cover",
              zIndex: 20,
              pointerEvents: "none",
            }}
          />
        )}

        {activeSnowbank === "lower" && bigSnowbankX !== null && (
          <div
            className="big-snowbank big-snowbank-lower"
            style={{
              position: "absolute",
              left: bigSnowbankX - scrollX,
              bottom: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url(${SNOWDRIFT_VARIANTS.lower})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "top center",
              backgroundSize: "cover",
              zIndex: 20,
              pointerEvents: "none",
            }}
          />
        )}

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
