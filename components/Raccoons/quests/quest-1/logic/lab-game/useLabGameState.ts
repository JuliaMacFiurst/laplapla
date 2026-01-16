  "use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LabThing } from "./types";
import {
  FALLING_CATCH_LINE,
  FALLING_LANE_COUNT,
  FALLING_REMOVAL_LINE,
  FALLING_SPEED_MAX,
  FALLING_SPEED_MIN,
  FALLING_START_Y,
  LaneState,
  ScoreEntry,
  FallingThingStatus,
} from "./types";
import labThings from "./lab-things.json";


const shuffleArray = <T,>(source: T[]): T[] => {
  const items = [...source];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [items[i], items[randomIndex]] = [items[randomIndex], items[i]];
  }
  return items;
};

const buildOrderedQueue = (source: LabThing[]): LabThing[] => {
  const positives = shuffleArray(source.filter((thing) => thing.score > 0));
  const negatives = shuffleArray(source.filter((thing) => thing.score < 0));
  const queue: LabThing[] = [];

  while (positives.length || negatives.length) {
    const batch: LabThing[] = [];

    const nextPositive =
      positives.length > 0
        ? positives.pop()!
        : negatives.length > 0
        ? negatives.pop()!
        : undefined;

    if (nextPositive) {
      batch.push(nextPositive);
    }

    for (let i = 0; i < 2; i += 1) {
      if (negatives.length) {
        batch.push(negatives.pop()!);
        continue;
      }

      if (positives.length) {
        batch.push(positives.pop()!);
      }
    }

    if (!batch.length) {
      break;
    }

    queue.push(...batch);
  }

  return queue;
};

const createInitialLanes = (items: LabThing[]): LaneState[] =>
  Array.from({ length: FALLING_LANE_COUNT }, (_, laneIndex) => ({
    laneIndex,
    item: items[laneIndex] ?? null,
    y: FALLING_START_Y - Math.random() * (FALLING_SPEED_MAX - FALLING_SPEED_MIN),
    speed:
      FALLING_SPEED_MIN + Math.random() * (FALLING_SPEED_MAX - FALLING_SPEED_MIN),
    status: items[laneIndex] ? "falling" : undefined,
  }));

export function useLabGameState() {
  const lastPositiveLaneRef = useRef<number>(-1);

  const [orderedQueue] = useState<LabThing[]>(() =>
    buildOrderedQueue(labThings as LabThing[])
  );
  const [lanes, setLanes] = useState<LaneState[]>(() =>
    createInitialLanes(orderedQueue)
  );
  const lanesRef = useRef<LaneState[]>(lanes);

  useEffect(() => {
    lanesRef.current = lanes;
  }, [lanes]);

  const nextItemIndexRef = useRef(
    Math.min(FALLING_LANE_COUNT, orderedQueue.length)
  );
  const [scoreTotal, setScoreTotal] = useState(0);
  const [scoreLog, setScoreLog] = useState<ScoreEntry[]>([]);
  const [caughtThings, setCaughtThings] = useState<LabThing[]>([]);
  const [loganComment, setLoganComment] = useState<string | null>(null);
  const [isBackpackActive, setBackpackActive] = useState(false);
  const [handledCount, setHandledCount] = useState(0);
  const [isFinished, setFinished] = useState(false);
  const [backpackLane, setBackpackLane] = useState(
    Math.floor(FALLING_LANE_COUNT / 2)
  );

  const loganTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backpackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(0);
  const randomSpeed = () =>
    FALLING_SPEED_MIN +
    Math.random() * (FALLING_SPEED_MAX - FALLING_SPEED_MIN);
  const statusTimersRef = useRef(
    new Map<number, ReturnType<typeof setTimeout>>()
  );

  const totalThings = orderedQueue.length;

  useEffect(() => {
    if (totalThings === 0) {
      setFinished(true);
      return;
    }

    if (handledCount >= totalThings) {
      setFinished(true);
    }
  }, [handledCount, totalThings]);

  const clearTimers = useCallback(() => {
    if (loganTimerRef.current) {
      clearTimeout(loganTimerRef.current);
      loganTimerRef.current = null;
    }

    if (backpackTimerRef.current) {
      clearTimeout(backpackTimerRef.current);
      backpackTimerRef.current = null;
    }

    statusTimersRef.current.forEach(clearTimeout);
    statusTimersRef.current.clear();
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const triggerLoganComment = useCallback((text?: string) => {
    if (!text) {
      setLoganComment(null);
      return;
    }

    setLoganComment(text);

    if (loganTimerRef.current) {
      clearTimeout(loganTimerRef.current);
    }

    loganTimerRef.current = setTimeout(() => {
      setLoganComment(null);
      loganTimerRef.current = null;
    }, 5000);
  }, []);

  const triggerBackpackPulse = useCallback(() => {
    setBackpackActive(true);

    if (backpackTimerRef.current) {
      clearTimeout(backpackTimerRef.current);
    }

    backpackTimerRef.current = setTimeout(() => {
      setBackpackActive(false);
      backpackTimerRef.current = null;
    }, 4200);
  }, []);

  const spawnTriple = useCallback(() => {
    setLanes((prev) => {
      let pointer = nextItemIndexRef.current;
      if (pointer >= totalThings) return prev;

      // определяем lane для полезного предмета по кругу
      const positiveLane =
        (lastPositiveLaneRef.current + 1) % FALLING_LANE_COUNT;
      lastPositiveLaneRef.current = positiveLane;

      const usedIds = new Set<string>();
      const nextLanes = prev.map((lane) => {
        if (lane.item) return lane;
        if (pointer >= totalThings) return lane;

        let nextItem = orderedQueue[pointer];

        // если это lane для полезного предмета — ищем первый положительный
        if (lane.laneIndex === positiveLane) {
          let search = pointer;
          while (search < totalThings) {
            const candidate = orderedQueue[search];
            if (candidate.score > 0 && !usedIds.has(candidate.id)) {
              nextItem = candidate;
              // меняем местами в очереди, чтобы не потерять порядок
              [orderedQueue[pointer], orderedQueue[search]] = [
                orderedQueue[search],
                orderedQueue[pointer],
              ];
              break;
            }
            search++;
          }
        }

        if (usedIds.has(nextItem.id)) {
          return lane;
        }

        usedIds.add(nextItem.id);
        pointer += 1;

        return {
          ...lane,
          item: nextItem,
          y: FALLING_START_Y,
          speed: randomSpeed(),
          status: "falling" as const,
        };
      });

      nextItemIndexRef.current = pointer;
      return nextLanes;
    });
  }, [orderedQueue, totalThings]);

  const scheduleLaneReset = useCallback(
    (laneIndex: number, delay: number) => {
      if (statusTimersRef.current.has(laneIndex)) {
        clearTimeout(statusTimersRef.current.get(laneIndex)!);
      }

      const timer = setTimeout(() => {
        statusTimersRef.current.delete(laneIndex);

        setLanes((prev) =>
          prev.map((lane) =>
            lane.laneIndex === laneIndex
              ? {
                  ...lane,
                  item: null,
                  status: undefined,
                  y: FALLING_START_Y,
                  speed: randomSpeed(),
                }
              : lane
          )
        );

        spawnTriple();
      }, delay);

      statusTimersRef.current.set(laneIndex, timer);
    },
    [spawnTriple]
  );

  const moveBackpackLane = useCallback((delta: number) => {
    setBackpackLane((prev) => {
      const next = Math.max(
        0,
        Math.min(prev + delta, FALLING_LANE_COUNT - 1)
      );
      return next;
    });
  }, []);

  type LaneEvent = {
    laneIndex: number;
    item: LabThing;
    status: FallingThingStatus;
  };

  const handleLaneResult = useCallback(
    (laneIndex: number, item: LabThing, status: FallingThingStatus) => {
      setHandledCount((prev) => Math.min(prev + 1, totalThings));

      if (status === "caught") {
        setScoreTotal((prev) => prev + item.score);
        console.log("[SCORE APPLY]", item.label, "score:", item.score);
        setScoreLog((prev) =>
          [
            { id: item.id, label: item.label, score: item.score },
            ...prev,
          ].slice(0, 6)
        );
        setCaughtThings((prev) => [...prev, item]);
        triggerLoganComment(item.loganComment);
        triggerBackpackPulse();
        console.log(
          `[LabGame] lane ${laneIndex} caught: ${item.label} (${item.score >= 0 ? "+" : ""}${item.score})`
        );
      } else {
        console.log(`[LabGame] lane ${laneIndex} missed: ${item.label}`);
      }
    },
    [totalThings, triggerBackpackPulse, triggerLoganComment]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (isFinished) {
        animationFrameRef.current = null;
        return;
      }

      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }

      const delta = Math.min(
        (timestamp - lastTimestampRef.current) / (1000 / 60),
        3
      );
      lastTimestampRef.current = timestamp;

      const events: LaneEvent[] = [];

      const prevLanes = lanesRef.current;

      const nextLanes: LaneState[] = prevLanes.map((lane) => {
        if (!lane.item || lane.status !== "falling") {
          return lane;
        }

        const nextY = lane.y + lane.speed * delta;
        const reachedEnd = nextY >= FALLING_REMOVAL_LINE;
        const canCatch =
          lane.laneIndex === backpackLane &&
          nextY >= FALLING_CATCH_LINE &&
          nextY < FALLING_REMOVAL_LINE;

        if (canCatch) {
          const currentItem = lane.item;
          if (currentItem) {
            events.push({
              laneIndex: lane.laneIndex,
              item: currentItem,
              status: "caught",
            });
            scheduleLaneReset(lane.laneIndex, 300);
          }

          return {
            ...lane,
            y: FALLING_CATCH_LINE,
            speed: 0,
            status: "caught",
          };
        }

        if (reachedEnd) {
          const currentItem = lane.item;
          if (currentItem) {
            events.push({
              laneIndex: lane.laneIndex,
              item: currentItem,
              status: "missed",
            });
            scheduleLaneReset(lane.laneIndex, 200);
          }

          return {
            ...lane,
            status: "missed",
            speed: 0,
          };
        }

        const shouldLogProgress =
          Math.floor(nextY) % 150 === 0 &&
          nextY > 0 &&
          nextY < FALLING_REMOVAL_LINE;

        if (shouldLogProgress) {
          console.log(
            `[LabGame] lane ${lane.laneIndex} is falling: ${lane.item.label} y=${nextY.toFixed(
              1
            )}`
          );
        }

        return {
          ...lane,
          y: nextY,
        };
      });

      // commit state + keep ref in sync for the next RAF tick
      lanesRef.current = nextLanes;
      setLanes(nextLanes);

      events.forEach((event) =>
        handleLaneResult(event.laneIndex, event.item, event.status)
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [backpackLane, handleLaneResult, isFinished, scheduleLaneReset]
  );

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animate]);

  useEffect(() => {
    const interval = setInterval(() => {
      spawnTriple();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [spawnTriple]);

  return {
    lanes,
    score: scoreTotal,
    scoreLog,
    caughtThings,
    loganComment,
    isBackpackActive,
    isFinished,
    totalThings,
    handledCount,
    onLaneResult: handleLaneResult,
    backpackLane,
    moveBackpackLane,
  };
}
