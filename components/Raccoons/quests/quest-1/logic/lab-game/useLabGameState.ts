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

const GAME_DURATION_MS = 45_000;

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

const createInitialLanes = (): LaneState[] =>
  Array.from({ length: FALLING_LANE_COUNT }, (_, laneIndex) => ({
    laneIndex,
    item: null,
    y: FALLING_START_Y,
    speed: 0,
    status: undefined,
  }));

export function useLabGameState() {
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(false);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderedQueueRef = useRef<LabThing[]>([]);
  const [queueSize, setQueueSize] = useState(0);

  const rebuildQueue = useCallback(() => {
    orderedQueueRef.current = buildOrderedQueue(labThings as LabThing[]);
    nextItemIndexRef.current = 0;
    const size = orderedQueueRef.current.length;
    setQueueSize(size);
  }, []);

  useEffect(() => {
    if (orderedQueueRef.current.length === 0) {
      rebuildQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [lanes, setLanes] = useState<LaneState[]>(() => createInitialLanes());
  const lanesRef = useRef<LaneState[]>(lanes);

  useEffect(() => {
    lanesRef.current = lanes;
  }, [lanes]);

  const nextItemIndexRef = useRef(0);
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

  const clearTimers = useCallback(() => {
    if (loganTimerRef.current) {
      clearTimeout(loganTimerRef.current);
      loganTimerRef.current = null;
    }

    if (backpackTimerRef.current) {
      clearTimeout(backpackTimerRef.current);
      backpackTimerRef.current = null;
    }
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

  const spawnNextItem = useCallback(() => {
    setLanes(prev => {
      let pointer = nextItemIndexRef.current;
      if (pointer >= orderedQueueRef.current.length) return prev;

      const next = prev.map(lane => {
        if (lane.item !== null) return lane;
        if (pointer >= orderedQueueRef.current.length) return lane;

        const item = orderedQueueRef.current[pointer++];
        return {
          ...lane,
          item,
          y: FALLING_START_Y,
          speed: randomSpeed(),
          status: "falling" as FallingThingStatus,
        };
      });

      nextItemIndexRef.current = pointer;
      return next;
    });
  }, []);

  const laneResetTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleLaneReset = useCallback(
    (laneIndex: number, delay: number) => {
      const existing = laneResetTimersRef.current.get(laneIndex);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        laneResetTimersRef.current.delete(laneIndex);

        if (!gameStartedRef.current) return;

        setLanes((prev) =>
          prev.map((lane) => {
            if (lane.laneIndex !== laneIndex) return lane;
            return {
              ...lane,
              item: null,
              status: undefined,
              y: FALLING_START_Y,
              speed: 0,
            };
          })
        );

        // spawn next if queue not exhausted
        if (nextItemIndexRef.current < orderedQueueRef.current.length) {
          spawnNextItem();
        }
      }, delay);

      laneResetTimersRef.current.set(laneIndex, timer);
    },
    [spawnNextItem]
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
    (_laneIndex: number, item: LabThing, status: FallingThingStatus) => {
      setHandledCount((v) => v + 1);

      if (status === "caught") {
        setScoreTotal((prev) => prev + item.score);
        setScoreLog((prev) =>
          [
            { id: item.id, label: item.label, score: item.score },
            ...prev,
          ].slice(0, 6)
        );
        setCaughtThings((prev) => [...prev, item]);
        triggerLoganComment(item.loganComment);
        triggerBackpackPulse();
      } else {
      }
    },
    [triggerBackpackPulse, triggerLoganComment]
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

        return {
          ...lane,
          y: nextY,
        };
      });

      // commit state + keep ref in sync for the next RAF tick
      lanesRef.current = nextLanes;
      setLanes(nextLanes);

      // removed finish logic from animate per patch instructions

      events.forEach((event) =>
        handleLaneResult(event.laneIndex, event.item, event.status)
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [backpackLane, handleLaneResult, isFinished, scheduleLaneReset, gameStarted, setFinished]
  );

  useEffect(() => {
    if (!gameStarted || isFinished) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

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
  }, [animate, gameStarted, isFinished]);

  // Removed effect that computed finish based on handledCount and lanes per instructions

  const startGame = useCallback(() => {
    if (gameStartedRef.current) return;

    rebuildQueue();

    setHandledCount(0);

    setFinished(false);

    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    gameStartedRef.current = true;
    setGameStarted(true);

    // ensure lanes are reset to empty at start
    const freshLanes = createInitialLanes();
    setLanes(freshLanes);
    lanesRef.current = freshLanes;

    // spawn immediately so player doesn't wait
    spawnNextItem();

    finishTimerRef.current = setTimeout(() => {
      setFinished(true);
    }, GAME_DURATION_MS);
  }, [rebuildQueue, spawnNextItem]);

  const resetGame = useCallback(() => {
    clearTimers();

    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    laneResetTimersRef.current.forEach((t) => clearTimeout(t));
    laneResetTimersRef.current.clear();

    setGameStarted(false);
    gameStartedRef.current = false;
    setFinished(false);
    setScoreTotal(0);
    setScoreLog([]);
    setCaughtThings([]);
    setHandledCount(0);
    setLoganComment(null);
    setBackpackActive(false);
    setBackpackLane(Math.floor(FALLING_LANE_COUNT / 2));

    rebuildQueue();

    const freshLanes = createInitialLanes();
    setLanes(freshLanes);
    lanesRef.current = freshLanes;
  }, [clearTimers, rebuildQueue]);

  return {
    lanes,
    score: scoreTotal,
    scoreLog,
    caughtThings,
    loganComment,
    isBackpackActive,
    isFinished,
    totalThings: queueSize,
    handledCount,
    onLaneResult: handleLaneResult,
    backpackLane,
    moveBackpackLane,
    gameStarted,
    startGame,
    resetGame,
  };
}
