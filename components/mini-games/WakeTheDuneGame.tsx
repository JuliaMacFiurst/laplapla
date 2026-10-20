import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import Image from "next/image";
import Router from "next/router";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { Lang } from "@/i18n";
import {
  SAND_SURPRISES,
  WAKE_THE_DUNE_COPY,
  WAKE_THE_DUNE_LEVELS,
  getWakeDuneLighting,
  getExpectedTapTimesMs,
  getPhraseMarkerTimesMs,
  getRhythmDurationMs,
  judgeRhythmTap,
  scoreRhythmTap,
} from "@/lib/miniGames/wakeTheDune";
import { SOUND_CASE_SAND_PARTICLES } from "@/lib/quests/soundCaseParticles";
import { WakeTheDuneAudio } from "@/lib/miniGames/wakeTheDuneAudio";
import {
  INITIAL_WAKE_THE_DUNE_PROGRESS,
  reduceWakeTheDuneProgress,
  type WakeTheDuneFailure,
  type WakeTheDunePhase,
} from "@/lib/miniGames/wakeTheDuneProgress";

type Particle = { id: number; x: number; y: number; dx: number; dy: number; size: number };
type Surprise = { id: number; value: string; x: number; y: number };
type TapFeedback = { id: number; x: number; y: number; label: string; points: number };

const TOTAL_LEVELS = WAKE_THE_DUNE_LEVELS.length;
const DUNE_VIEWBOX = { width: 2143, height: 772, touchX: 433.526, touchY: 531.782 } as const;
const MUSIC_LAYERS = [
  ["melody", "/icons/instruments-icons/chords.webp"],
  ["guitar + flute", "/icons/instruments-icons/acoustic-guitar.webp"],
  ["bass", "/icons/instruments-icons/bass.webp"],
  ["guitar + flute", "/icons/instruments-icons/flute.webp"],
  ["drums", "/icons/instruments-icons/percussion.webp"],
  ["low drums", "/icons/instruments-icons/beat.webp"],
  ["fx + bass", "/icons/instruments-icons/fx.webp"],
  ["vocal", "/icons/instruments-icons/loop.webp"],
] as const;
const schedule = (callback: () => void, delay: number) => window.setTimeout(callback, Math.max(0, delay));
const FINAL_LIGHTING_PROGRESS = 0.72;
const FINALE_PARTICLES = Array.from({ length: 24 }, (_, index) => ({
  x: 4 + ((index * 37) % 92),
  y: 9 + ((index * 29) % 68),
  size: 2 + (index % 4),
  delay: -((index * 0.43) % 5.4),
  drift: -18 + ((index * 17) % 37),
}));

function RhythmTimeline({
  levelIndex,
  phase,
  progress,
  nextBeat,
  demoBeat,
  hintEnabled,
}: {
  levelIndex: number;
  phase: WakeTheDunePhase;
  progress: number;
  nextBeat: number;
  demoBeat: number | null;
  hintEnabled: boolean;
}) {
  const level = WAKE_THE_DUNE_LEVELS[levelIndex];
  const expected = getExpectedTapTimesMs(level);
  const duration = getRhythmDurationMs(level);
  const phraseMarkers = getPhraseMarkerTimesMs(level);
  const hiddenForMemory = level.guide === "memory" && phase === "play";
  const softened = level.guide === "soft" && phase === "play";

  return (
    <div
      className={`wake-dune-timeline${hiddenForMemory ? " is-memory" : ""}${softened ? " is-soft" : ""}`}
      dir="ltr"
      aria-hidden="true"
      data-guide={level.guide}
    >
      <div className="wake-dune-timeline__track" />
      <div className="wake-dune-timeline__fill" style={{ width: `${progress * 100}%` }} />
      <i className="wake-dune-timeline__playhead" style={{ left: `${progress * 100}%` }} />
      {hintEnabled && phraseMarkers.map((time, index) => (
        <i
          key={`${level.id}-phrase-${time}`}
          className="wake-dune-timeline__phrase"
          style={{ left: `${(time / duration) * 100}%` }}
          data-phrase-index={index + 1}
        />
      ))}
      {expected.map((time, index) => (
        <span
          key={`${level.id}-${time}`}
          className={`wake-dune-timeline__beat${phase === "play" && index === nextBeat ? " is-next" : ""}${phase === "listen" && index === demoBeat ? " is-demo-active" : ""}${phase === "play" && index < nextBeat ? " is-hit" : ""}`}
          style={{ left: `${(time / duration) * 100}%` }}
        />
      ))}
    </div>
  );
}

function DuneArt({
  impact,
  lighting,
  singing,
  svgRef,
}: {
  impact: { id: number; svgX: number; svgY: number; pressed: boolean } | null;
  lighting: { lightLeft: number; lightRight: number; shadowLeft: number; shadowRight: number; night: number };
  singing: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}) {
  const source = "/quests/assets/dune.svg";
  const touchTransform = impact
    ? `translate(${impact.svgX - DUNE_VIEWBOX.touchX} ${impact.svgY - DUNE_VIEWBOX.touchY})`
    : undefined;
  return (
    <svg ref={svgRef} className={`wake-dune-art${singing ? " is-singing" : ""}`} viewBox="0 0 2143 772" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id="wake-dune-surface-clip">
          <use href={`${source}#light-left`} />
          <use href={`${source}#light-right`} />
          <use href={`${source}#shadow-right`} />
        </clipPath>
        <linearGradient id="wake-dune-night-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f547d" stopOpacity=".36" />
          <stop offset="1" stopColor="#18264f" stopOpacity=".7" />
        </linearGradient>
      </defs>
      <use href={`${source}#background`} className="wake-dune-art__base" />
      <g id="wake-dune-shadow-left" className="wake-dune-art__shadow wake-dune-art__shadow--left" style={{ opacity: lighting.shadowLeft }}>
        <use href={`${source}#light-left`} />
      </g>
      <use href={`${source}#shadow-right`} className="wake-dune-art__shadow" style={{ opacity: lighting.shadowRight }} />
      <use href={`${source}#light-left`} className="wake-dune-art__light" style={{ opacity: lighting.lightLeft }} />
      <use href={`${source}#light-right`} className="wake-dune-art__light" style={{ opacity: lighting.lightRight }} />
      <rect className="wake-dune-art__night" x="-40" y="220" width="2223" height="590" fill="url(#wake-dune-night-gradient)" clipPath="url(#wake-dune-surface-clip)" style={{ opacity: lighting.night }} />
      <use href={`${source}#foreground`} className="wake-dune-art__foreground" />
      <g className="wake-dune-art__hit" data-dune-hit="true">
        <use href={`${source}#light-left`} />
        <use href={`${source}#light-right`} />
      </g>
      {impact ? <g key={impact.id} className={`wake-dune-svg-touch${impact.pressed ? " is-pressed" : " is-released"}`} transform={touchTransform}>
        <use href={`${source}#touch`} />
      </g> : null}
    </svg>
  );
}

function SystemIcon({ kind }: { kind: "home" | "pause" | "play" | "rotate" }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {kind === "home" ? <><path d="m4 11 8-7 8 7" /><path d="M6.5 9.5V20h11V9.5M10 20v-6h4v6" /></> : kind === "pause"
      ? <><path d="M8 6v12" /><path d="M16 6v12" /></>
      : kind === "play" ? <path d="m9 6 9 6-9 6Z" />
        : <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M4 8a9 9 0 0 0 2 9M4 8l-2 3M4 8l3 1" /></>}
  </svg>;
}

function MusicLayers({ unlocked, justUnlocked }: { unlocked: number; justUnlocked: number | null }) {
  return <div className="wake-dune-layers" dir="ltr" aria-label={`${unlocked} / ${TOTAL_LEVELS}`}>
    {MUSIC_LAYERS.map(([label, icon], index) => <div
      key={`${label}-${index}`}
      className={`wake-dune-layer${index < unlocked ? " is-active" : ""}${index === justUnlocked ? " is-new" : ""}`}
      title={label}
    >
      <Image src={icon} width={30} height={30} alt="" />
      <span aria-hidden="true"><i /><i /><i /><i /></span>
    </div>)}
  </div>;
}

export function WakeTheDuneGame({ lang }: { lang: Lang }) {
  const copy = WAKE_THE_DUNE_COPY[lang];
  const [game, dispatch] = useReducer(reduceWakeTheDuneProgress, INITIAL_WAKE_THE_DUNE_PROGRESS);
  const { levelIndex, phase, nextBeat, failure, unlockedStems } = game;
  const [progress, setProgress] = useState(0);
  const [demoBeat, setDemoBeat] = useState<number | null>(null);
  const [handoffReveal, setHandoffReveal] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioWarning, setAudioWarning] = useState(false);
  const [audioRetrying, setAudioRetrying] = useState(false);
  const [stemUnlocking, setStemUnlocking] = useState(false);
  const [waitingPulse, setWaitingPulse] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [isMusicPaused, setIsMusicPaused] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [scorePulse, setScorePulse] = useState(0);
  const [tapFeedback, setTapFeedback] = useState<TapFeedback | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [surprises, setSurprises] = useState<Surprise[]>([]);
  const [foundSurprises, setFoundSurprises] = useState<Set<string>>(() => new Set());
  const [impact, setImpact] = useState<{ id: number; svgX: number; svgY: number; pressed: boolean } | null>(null);
  const audioRef = useRef<WakeTheDuneAudio | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const timersRef = useRef<number[]>([]);
  const timelineStartRef = useRef(0);
  const particleIdRef = useRef(0);
  const successfulTapsRef = useRef(0);
  const attemptIdRef = useRef(0);
  const rewardTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const pausedAttemptRef = useRef(false);
  const pausedRef = useRef(false);
  const pauseCycleRef = useRef(0);
  const exitFromPauseRef = useRef(false);
  const dayProgressRef = useRef(0);
  const expectedTimes = useMemo(() => getExpectedTapTimesMs(WAKE_THE_DUNE_LEVELS[levelIndex]), [levelIndex]);
  const timelineDuration = useMemo(() => getRhythmDurationMs(WAKE_THE_DUNE_LEVELS[levelIndex]), [levelIndex]);
  const level = WAKE_THE_DUNE_LEVELS[levelIndex];
  const isRtl = lang === "he";
  const isFinalScene = levelIndex === TOTAL_LEVELS - 1 && (phase === "reward" || phase === "celebration" || phase === "listening");
  const currentDayProgress = phase === "complete"
    ? FINAL_LIGHTING_PROGRESS
    : Math.min(1, (unlockedStems + ((phase === "listen" || phase === "play" || phase === "handoff") ? progress * 0.9 : 0)) / TOTAL_LEVELS);
  dayProgressRef.current = Math.max(dayProgressRef.current, currentDayProgress);
  const dayProgress = dayProgressRef.current;
  const lightingProgress = isFinalScene ? FINAL_LIGHTING_PROGRESS : dayProgress;
  const lighting = getWakeDuneLighting(lightingProgress);
  const sceneStyle = {
    "--day-progress": lighting.progress,
    "--sun-x": `${lighting.sunX}%`,
    "--sun-y": `${lighting.sunY}%`,
    "--sun-opacity": lighting.sunOpacity,
    "--stars-opacity": lighting.night,
    "--night-opacity": lighting.night,
    "--dawn-opacity": lighting.dawn,
    "--day-opacity": lighting.day,
    "--sunset-opacity": lighting.sunset,
    "--ambient-glow-opacity": lighting.ambientGlow,
  } as CSSProperties;
  const shouldOfferFinalHint = levelIndex === TOTAL_LEVELS - 1
    && phase === "failed"
    && !game.finalHintEnabled
    && game.finalFailureCount >= game.finalHintNextOfferAt;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((callback: () => void, delay: number) => {
    const timer = schedule(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const makeImpact = useCallback((svgX: number, svgY: number, allowSurprise: boolean) => {
    const id = ++particleIdRef.current;
    const x = (svgX / DUNE_VIEWBOX.width) * 100;
    const y = (svgY / DUNE_VIEWBOX.height) * 100;
    setImpact({ id, svgX, svgY, pressed: true });
    addTimer(() => setImpact((current) => current?.id === id ? { ...current, pressed: false } : current), 110);
    addTimer(() => setImpact((current) => current?.id === id ? null : current), 680);
    const burst = Array.from({ length: 7 }, (_, index): Particle => {
      const angle = (-Math.PI * 0.88) + (index / 6) * Math.PI * 0.76;
      const distance = 36 + ((id + index * 17) % 34);
      return {
        id: ++particleIdRef.current,
        x,
        y,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: 3 + ((id + index) % 5),
      };
    });
    setParticles((current) => [...current, ...burst].slice(-28));
    addTimer(() => setParticles((current) => current.filter((particle) => !burst.some((item) => item.id === particle.id))), 850);

    if (!allowSurprise) return;
    successfulTapsRef.current += 1;
    if (successfulTapsRef.current % 4 !== 0) return;
    const value = SAND_SURPRISES[(successfulTapsRef.current / 4 - 1) % SAND_SURPRISES.length];
    setFoundSurprises((current) => new Set(current).add(value));
    const surprise = { id: ++particleIdRef.current, value, x, y };
    setSurprises((current) => [...current, surprise].slice(-3));
    addTimer(() => setSurprises((current) => current.filter((item) => item.id !== surprise.id)), 1800);
  }, [addTimer]);

  const failAttempt = useCallback((kind: WakeTheDuneFailure, attemptId = game.attemptId) => {
    clearTimers();
    dispatch({ type: "fail", attemptId, failure: kind });
    setProgress(0);
    setDemoBeat(null);
    setTapFeedback(null);
    audioRef.current?.setMode("play");
    audioRef.current?.playFailure();
  }, [clearTimers, game.attemptId]);

  const beginPlay = useCallback((attemptId: number) => {
    setProgress(0);
    setHandoffReveal(false);
    timelineStartRef.current = performance.now();
    audioRef.current?.setMode("play");
    dispatch({ type: "begin-play", attemptId });
  }, []);

  const runDemo = useCallback(() => {
    if (!audioReady) return;
    const audio = audioRef.current;
    if (!audio) return;
    clearTimers();
    audio.unlock();
    audio.startTransport();
    audio.setMode("listen");
    const attemptId = attemptIdRef.current + 1;
    attemptIdRef.current = attemptId;
    dispatch({ type: "begin-demo", attemptId });
    setProgress(0);
    setDemoBeat(null);
    setHandoffReveal(false);
    timelineStartRef.current = performance.now();

    expectedTimes.forEach((time, index) => {
      addTimer(() => {
        if (attemptIdRef.current !== attemptId) return;
        audioRef.current?.playTap();
        setDemoBeat(index);
        const x = 340 + ((index * 211 + levelIndex * 97) % 560);
        const y = 460 + ((index * 73) % 150);
        makeImpact(x, y, false);
        addTimer(() => { if (attemptIdRef.current === attemptId) setDemoBeat(null); }, 190);
      }, time);
    });
    addTimer(() => {
      if (attemptIdRef.current !== attemptId) return;
      setProgress(0);
      setDemoBeat(null);
      dispatch({ type: "handoff", attemptId });
      addTimer(() => { if (attemptIdRef.current === attemptId) setHandoffReveal(true); }, 330);
      addTimer(() => beginPlay(attemptId), 920);
    }, timelineDuration);
  }, [addTimer, audioReady, beginPlay, clearTimers, expectedTimes, levelIndex, makeImpact, timelineDuration]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    const audio = new WakeTheDuneAudio();
    audioRef.current = audio;
    void audio.prepareInitial().then(() => {
      if (!active) return;
      setAudioReady(true);
      audio.preloadAhead(0);
    }).catch(() => {
      if (!active) return;
      setAudioWarning(true);
      setAudioReady(true); // Synth SFX fallback keeps gameplay available.
    });
    return () => {
      active = false;
      mountedRef.current = false;
      clearTimers();
      audio.dispose();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [clearTimers]);

  const retryAudioLoad = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioRetrying) return;
    setAudioRetrying(true);
    void audio.prepareInitial().then(() => {
      if (!mountedRef.current || audioRef.current !== audio) return;
      setAudioWarning(false);
      audio.preloadAhead(levelIndex);
    }).catch(() => {
      if (mountedRef.current && audioRef.current === audio) setAudioWarning(true);
    }).finally(() => {
      if (mountedRef.current && audioRef.current === audio) setAudioRetrying(false);
    });
  }, [audioRetrying, levelIndex]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;
    const debugWindow = window as typeof window & { __WAKE_THE_DUNE_DEBUG__?: unknown };
    const debugValue = {
      game,
      audio: () => audioRef.current?.getDebugSnapshot() ?? null,
    };
    debugWindow.__WAKE_THE_DUNE_DEBUG__ = debugValue;
    return () => {
      if (debugWindow.__WAKE_THE_DUNE_DEBUG__ === debugValue) delete debugWindow.__WAKE_THE_DUNE_DEBUG__;
    };
  }, [game]);

  useEffect(() => {
    if (isPaused || (phase !== "listen" && phase !== "play")) return;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - timelineStartRef.current;
      setProgress(Math.min(1, Math.max(0, elapsed / timelineDuration)));
      if (phase === "play" && nextBeat < expectedTimes.length && elapsed > expectedTimes[nextBeat] + level.toleranceMs) {
        failAttempt("late", game.attemptId);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [expectedTimes, failAttempt, game.attemptId, isPaused, level.toleranceMs, nextBeat, phase, timelineDuration]);

  const finishLevel = useCallback((attemptId: number) => {
    clearTimers();
    dispatch({ type: "reward", attemptId });
    setProgress(1);
    setStemUnlocking(true);
    audioRef.current?.setMode("reward");
    audioRef.current?.playSuccess();
    const rewardToken = rewardTokenRef.current + 1;
    rewardTokenRef.current = rewardToken;
    const unlock = audioRef.current?.unlockStem(level.stem).catch(() => {
      if (mountedRef.current && rewardTokenRef.current === rewardToken) setAudioWarning(true);
    }) ?? Promise.resolve();
    const minimumReward = new Promise<void>((resolve) => { addTimer(resolve, levelIndex === TOTAL_LEVELS - 1 ? 3600 : 1800); });
    void Promise.allSettled([unlock, minimumReward]).then(() => {
      if (!mountedRef.current || rewardTokenRef.current !== rewardToken) return;
      setStemUnlocking(false);
      if (levelIndex === TOTAL_LEVELS - 1) dispatch({ type: "celebrate" });
    });
  }, [addTimer, clearTimers, level.stem, levelIndex]);

  const handleTap = useCallback((svgX: number, svgY: number) => {
    if (phase !== "play" || isPaused || pausedRef.current) return;
    const elapsed = performance.now() - timelineStartRef.current;
    const judgement = judgeRhythmTap(expectedTimes[nextBeat], elapsed, level.toleranceMs);
    makeImpact(svgX, svgY, judgement === "hit");
    if (judgement !== "hit") {
      failAttempt(judgement, game.attemptId);
      return;
    }
    audioRef.current?.playTap();
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(8);
    const scored = scoreRhythmTap(expectedTimes[nextBeat], elapsed);
    const feedbackId = ++particleIdRef.current;
    setTapFeedback({
      id: feedbackId,
      x: (svgX / DUNE_VIEWBOX.width) * 100,
      y: (svgY / DUNE_VIEWBOX.height) * 100,
      label: copy[scored.accuracy],
      points: scored.points,
    });
    addTimer(() => setTapFeedback((current) => current?.id === feedbackId ? null : current), 720);
    const next = nextBeat + 1;
    dispatch({ type: "hit", attemptId: game.attemptId, ...scored });
    setScorePulse((current) => current + 1);
    if (next === expectedTimes.length) addTimer(() => finishLevel(game.attemptId), 240);
  }, [addTimer, copy, expectedTimes, failAttempt, finishLevel, game.attemptId, isPaused, level.toleranceMs, makeImpact, nextBeat, phase]);

  const handlePointer = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isPaused || pausedRef.current || !(event.target instanceof SVGElement) || !event.target.closest("[data-dune-hit='true']")) return;
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const x = Math.max(0, Math.min(DUNE_VIEWBOX.width, local.x));
    const y = Math.max(0, Math.min(DUNE_VIEWBOX.height, local.y));
    if (phase === "listen" || phase === "handoff") {
      setWaitingPulse(true);
      addTimer(() => setWaitingPulse(false), 260);
      return;
    }
    handleTap(x, y);
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleTap(DUNE_VIEWBOX.width * 0.5, DUNE_VIEWBOX.height * 0.67);
  };

  const advance = () => {
    rewardTokenRef.current += 1;
    dispatch({ type: "advance", totalLevels: TOTAL_LEVELS });
    setProgress(0);
    audioRef.current?.setMode("normal");
  };

  const acceptFinalHint = () => {
    dispatch({ type: "enable-final-hint" });
    runDemo();
  };

  const declineFinalHint = () => {
    dispatch({ type: "decline-final-hint" });
    runDemo();
  };

  const enterListeningMode = () => {
    setIsMusicPaused(false);
    audioRef.current?.setMode("reward");
    void audioRef.current?.resume();
    dispatch({ type: "enter-listening" });
  };

  const toggleMusic = () => {
    if (isMusicPaused) {
      setIsMusicPaused(false);
      void audioRef.current?.resume();
    } else {
      setIsMusicPaused(true);
      void audioRef.current?.suspend();
    }
  };

  const pauseGame = useCallback(() => {
    if (isPaused) return;
    pauseCycleRef.current += 1;
    pausedRef.current = true;
    const activeAttempt = phase === "listen" || phase === "handoff" || phase === "play";
    pausedAttemptRef.current = activeAttempt;
    clearTimers();
    setTapFeedback(null);
    setDemoBeat(null);
    if (activeAttempt) {
      const cancelledAttemptId = attemptIdRef.current + 1;
      attemptIdRef.current = cancelledAttemptId;
      dispatch({ type: "cancel-attempt", attemptId: cancelledAttemptId });
      setProgress(0);
    } else if (phase === "reward") {
      rewardTokenRef.current += 1;
      setStemUnlocking(false);
      if (levelIndex === TOTAL_LEVELS - 1 && unlockedStems === TOTAL_LEVELS) dispatch({ type: "celebrate" });
    }
    setIsPaused(true);
    void audioRef.current?.suspend();
  }, [clearTimers, isPaused, levelIndex, phase, unlockedStems]);

  const resumeGame = useCallback(() => {
    const resumeCycle = ++pauseCycleRef.current;
    pausedRef.current = false;
    setIsPaused(false);
    void audioRef.current?.resume().then(() => {
      if (pauseCycleRef.current !== resumeCycle || pausedRef.current) return;
      if (pausedAttemptRef.current) {
        pausedAttemptRef.current = false;
        runDemo();
      }
    });
  }, [runDemo]);

  useEffect(() => {
    document.body.classList.add("wake-dune-game-active");
    return () => document.body.classList.remove("wake-dune-game-active");
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(orientation: landscape) and (max-height: 600px) and (pointer: coarse)");
    const update = () => {
      setIsMobileLandscape(query.matches);
      if (query.matches && !pausedRef.current) pauseGame();
    };
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [pauseGame]);

  useEffect(() => {
    const pauseForVisibility = () => {
      if (document.visibilityState === "hidden" && !pausedRef.current) pauseGame();
    };
    const pauseForPageHide = () => {
      if (!pausedRef.current) pauseGame();
    };
    document.addEventListener("visibilitychange", pauseForVisibility);
    window.addEventListener("pagehide", pauseForPageHide);
    return () => {
      document.removeEventListener("visibilitychange", pauseForVisibility);
      window.removeEventListener("pagehide", pauseForPageHide);
    };
  }, [pauseGame]);

  const openExit = () => {
    exitFromPauseRef.current = isPaused;
    if (!isPaused) pauseGame();
    setExitOpen(true);
  };

  const closeExit = () => {
    setExitOpen(false);
    if (!exitFromPauseRef.current) resumeGame();
  };

  const confirmExit = () => {
    setExitOpen(false);
    audioRef.current?.dispose();
    audioRef.current = null;
    void Router.push("/quests/sound-case-001/hub", undefined, { locale: lang });
  };

  const finishGame = () => {
    audioRef.current?.dispose();
    audioRef.current = null;
    void Router.push("/quests/sound-case-001/hub", undefined, { locale: lang });
  };

  const restart = () => {
    clearTimers();
    rewardTokenRef.current += 1;
    attemptIdRef.current += 1;
    audioRef.current?.restartTransport();
    audioRef.current?.setMode("normal");
    dispatch({ type: "restart" });
    setFoundSurprises(new Set());
    successfulTapsRef.current = 0;
    setProgress(0);
    setStemUnlocking(false);
    setAudioWarning(false);
    setTapFeedback(null);
    setIsMusicPaused(false);
    pausedRef.current = false;
    pauseCycleRef.current += 1;
    setIsPaused(false);
    dayProgressRef.current = 0;
  };

  const modeTitle = phase === "listen" ? levelIndex === TOTAL_LEVELS - 1 ? copy.finalListening : copy.listenTitle
    : phase === "play" ? copy.playTitle
      : phase === "handoff" ? handoffReveal ? copy.playTitle : copy.transitionReady
        : phase === "failed" ? failure === "early" ? copy.early : copy.asleep
          : phase === "reward" ? copy.awake
            : levelIndex === TOTAL_LEVELS - 1 ? copy.finalRhythm : copy.firstInstruction;
  const modeDetail = phase === "listen"
    ? levelIndex === TOTAL_LEVELS - 1 ? copy.finalByEar : levelIndex === 0 ? copy.listenDetailFirst : copy.listenDetail
    : phase === "play" || (phase === "handoff" && handoffReveal)
      ? levelIndex === 0 ? copy.playDetailFirst : copy.playDetail
      : phase === "ready" && levelIndex === TOTAL_LEVELS - 1 ? copy.finalAlmostAwake : "";

  return (
    <main
      className={`wake-dune-page${isPaused ? " is-paused" : ""}${isFinalScene ? " is-finale" : ""}${phase === "listening" ? " is-listening" : ""}`}
      lang={lang}
      dir={isRtl ? "rtl" : "ltr"}
      data-mini-game="wake-the-dune"
      data-day-phase={lighting.night > 0.75 ? "night" : lighting.progress > 0.52 ? "sunset" : lighting.progress > 0.2 ? "day" : "dawn"}
      data-lighting-progress={lighting.progress.toFixed(4)}
      style={sceneStyle}
    >
      <div className="wake-dune-sky" aria-hidden="true">
        <i className="wake-dune-sky__dawn" /><i className="wake-dune-sky__day" /><i className="wake-dune-sky__sunset" /><i className="wake-dune-sky__night" />
        <span className="wake-dune-ambient-glow" />
        <span className="wake-dune-sun" /><span className="wake-dune-moon" />
        <span className="wake-dune-stars">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</span>
      </div>
      <div className="wake-dune-shell">
        <nav className="wake-dune-controls" aria-label={copy.pauseLabel}>
          <button type="button" onClick={openExit} aria-label={copy.exitLabel}><SystemIcon kind="home" /></button>
          <button
            type="button"
            onClick={phase === "listening" ? toggleMusic : pauseGame}
            aria-label={phase === "listening" ? isMusicPaused ? copy.playMusic : copy.pauseMusic : copy.pauseLabel}
          ><SystemIcon kind={phase === "listening" && isMusicPaused ? "play" : "pause"} /></button>
        </nav>
        <header className="wake-dune-header">
          <bdi dir="ltr">{copy.caseLabel}</bdi>
          <h1>{copy.title}</h1>
          {!isFinalScene && phase !== "complete" && <div className="wake-dune-hud">
            <p>{copy.level} <bdi dir="ltr">{levelIndex + 1} / {TOTAL_LEVELS}</bdi></p>
            <strong key={scorePulse}>★ <bdi dir="ltr">{(game.totalScore + game.attemptScore).toLocaleString("en-US")}</bdi></strong>
          </div>}
          {!isFinalScene && phase !== "complete" && <div className="wake-dune-level-track" dir="ltr" aria-label={`${copy.level} ${levelIndex + 1} / ${TOTAL_LEVELS}`}>
            {WAKE_THE_DUNE_LEVELS.map((item, index) => <i key={item.id} className={index < levelIndex ? "is-complete" : index === levelIndex ? "is-current" : ""} />)}
          </div>}
        </header>

        {isFinalScene ? (
          <section className={`wake-dune-finale wake-dune-finale--${phase}`} data-finale-mode={phase} data-unlocked-stems={unlockedStems}>
            <div className="wake-dune-finale__dune">
              <DuneArt impact={null} lighting={lighting} singing svgRef={svgRef} />
            </div>
            <div className="wake-dune-finale__resonance" aria-hidden="true"><i /><i /><i /></div>
            <div className="wake-dune-finale__particles" aria-hidden="true">
              {FINALE_PARTICLES.map((particle, index) => <i key={index} style={{
                "--final-x": `${particle.x}%`, "--final-y": `${particle.y}%`, "--final-size": `${particle.size}px`,
                "--final-delay": `${particle.delay}s`, "--final-drift": `${particle.drift}px`,
              } as CSSProperties} />)}
            </div>
            <div className="wake-dune-finale__copy" role="status">
              <h2>{copy.awake}</h2>
              <p>{copy.finalVoicesTogether}</p>
              {phase === "reward" ? <span className="wake-dune-finale__awakening">{copy.audioLoading}</span> : phase === "celebration" ? <div className="wake-dune-finale__actions">
                <button type="button" onClick={enterListeningMode}>{copy.listenToDune}</button>
                <button type="button" onClick={finishGame}>{copy.finishGame}</button>
              </div> : <div className="wake-dune-finale__listening-controls">
                <button type="button" onClick={finishGame}>{copy.finishGame}</button>
              </div>}
            </div>
          </section>
        ) : phase !== "complete" ? (
          <>
            <section className={`wake-dune-guide wake-dune-guide--${phase}`} aria-live="polite" data-mode={phase}>
              <div className="wake-dune-mode">
                <strong>{modeTitle}</strong>
                {modeDetail && <span>{modeDetail}</span>}
              </div>
              <RhythmTimeline levelIndex={levelIndex} phase={phase} progress={progress} nextBeat={nextBeat} demoBeat={demoBeat} hintEnabled={game.finalHintEnabled} />
            </section>

            <div className={`wake-dune-mobile-tap-hint${phase === "play" ? " is-visible" : ""}`} aria-hidden="true">
              <span>👆</span>{copy.tapHint}
            </div>

            <section className={`wake-dune-stage wake-dune-stage--${phase}${phase === "reward" ? " is-singing" : ""}${phase === "failed" ? " is-sleeping" : ""}${waitingPulse ? " is-waiting-touch" : ""}`}>
              <div className="wake-dune-atmosphere" aria-hidden="true">
                {SOUND_CASE_SAND_PARTICLES.map(([x, y, delay], index) => <i key={index} style={{ "--sand-x": `${x}%`, "--sand-y": `${y}%`, "--sand-delay": `${delay}s` } as CSSProperties} />)}
              </div>
              <button
                type="button"
                className="wake-dune-touch"
                aria-label={copy.tapLabel}
                aria-disabled={phase !== "play"}
                tabIndex={phase === "play" ? 0 : -1}
                onPointerDown={handlePointer}
                onKeyDown={handleKey}
              >
                <DuneArt impact={impact} lighting={lighting} singing={phase === "reward"} svgRef={svgRef} />
                <span className="wake-dune-particles" aria-hidden="true">
                  {particles.map((particle) => (
                    <i key={particle.id} style={{
                      left: `${particle.x}%`, top: `${particle.y}%`, width: particle.size, height: particle.size,
                      "--dust-x": `${particle.dx}px`, "--dust-y": `${particle.dy}px`,
                    } as CSSProperties} />
                  ))}
                </span>
                {tapFeedback && <span key={tapFeedback.id} className="wake-dune-score-pop" style={{ left: `${tapFeedback.x}%`, top: `${tapFeedback.y}%` }}>
                  {tapFeedback.label} +{tapFeedback.points}
                </span>}
                <span className="wake-dune-surprises" aria-hidden="true">
                  {surprises.map((surprise) => <i key={surprise.id} style={{ left: `${surprise.x}%`, top: `${surprise.y}%` }}>{surprise.value}</i>)}
                </span>
                {phase === "play" && <span className="wake-dune-touch__hint">{copy.tapLabel}</span>}
              </button>
              {phase === "ready" && <button className="wake-dune-action" type="button" disabled={!audioReady} onClick={runDemo}>{audioReady ? copy.start : copy.audioLoading}</button>}
              {phase === "failed" && (shouldOfferFinalHint ? <div className="wake-dune-hint-prompt" role="dialog" aria-label={copy.hintQuestion.replace("\n", " ")}>
                <strong>{copy.hintQuestion.split("\n").map((line) => <span key={line}>{line}</span>)}</strong>
                <div><button type="button" onClick={acceptFinalHint}>{copy.hintShow}</button><button type="button" onClick={declineFinalHint}>{copy.hintTryAgain}</button></div>
              </div> : <button className="wake-dune-action" type="button" onClick={runDemo}>{copy.retry}</button>)}
              {phase === "reward" && (
                <div className="wake-dune-reward" role="status">
                  <span>{copy.newLayer}</span>
                  <b>{copy.layerUnlocked}</b>
                  <strong>{copy.music} <bdi dir="ltr">{String(levelIndex + 1).padStart(2, "0")} / {TOTAL_LEVELS}</bdi></strong>
                  {game.lastLevelResult && <dl className="wake-dune-score-breakdown">
                    <div><dt>{copy.rhythmScore}</dt><dd>+{game.lastLevelResult.rhythm}</dd></div>
                    {game.lastLevelResult.firstTry > 0 && <div><dt>{copy.firstTryBonus}</dt><dd>+{game.lastLevelResult.firstTry}</dd></div>}
                    <div><dt>{copy.levelBonus}</dt><dd>+{game.lastLevelResult.levelBonus}</dd></div>
                    <div><dt>{copy.total}</dt><dd>★ {game.lastLevelResult.total.toLocaleString("en-US")}</dd></div>
                  </dl>}
                  {stemUnlocking && <small>{copy.audioLoading}</small>}
                  <button type="button" disabled={stemUnlocking} onClick={advance}>
                    {levelIndex === TOTAL_LEVELS - 1 ? copy.finish : copy.nextLevel}
                  </button>
                </div>
              )}
            </section>

            {audioWarning && <p className="wake-dune-audio-warning" role="status"><span>{copy.audioWarning}</span><button type="button" disabled={audioRetrying} onClick={retryAudioLoad}>{audioRetrying ? copy.audioLoading : copy.audioRetry}</button></p>}

            <section className="wake-dune-music-board" aria-label={copy.music}>
              {phase === "reward" && <strong>{copy.newLayer}</strong>}
              <MusicLayers unlocked={unlockedStems} justUnlocked={phase === "reward" ? levelIndex : null} />
            </section>

            <footer className="wake-dune-progress">
              <div><strong>{copy.music}</strong><span dir="ltr">{unlockedStems} / {TOTAL_LEVELS}</span></div>
              <div className="wake-dune-progress__dots" dir="ltr" aria-label={`${copy.music}: ${unlockedStems} / ${TOTAL_LEVELS}`}>
                {WAKE_THE_DUNE_LEVELS.map((item, index) => <i key={item.id} className={index < unlockedStems ? "is-open" : ""} />)}
              </div>
              <small>{copy.found} <bdi dir="ltr">{foundSurprises.size} / {SAND_SURPRISES.length}</bdi></small>
            </footer>
          </>
        ) : (
          <section className="wake-dune-complete">
            <div className="wake-dune-complete__sun" aria-hidden="true">✦</div>
            <h2>{copy.completeTitle}</h2>
            <p>{copy.completeBody}</p>
            <strong className="wake-dune-final-score">★ {game.totalScore.toLocaleString("en-US")}</strong>
            <dl className="wake-dune-final-accuracy">
              <div><dt>{copy.perfect}</dt><dd>{game.perfectCount}</dd></div>
              <div><dt>{copy.great}</dt><dd>{game.greatCount}</dd></div>
              <div><dt>{copy.good}</dt><dd>{game.goodCount}</dd></div>
            </dl>
            <div className="wake-dune-complete__voices" dir="ltr">{WAKE_THE_DUNE_LEVELS.map((item) => <i key={item.id}>●</i>)}</div>
            <button type="button" onClick={restart}>{copy.playAgain}</button>
          </section>
        )}
      </div>
      {isPaused && !exitOpen && <div className="wake-dune-modal" role="dialog" aria-modal="true" aria-labelledby="wake-dune-pause-title">
        <div>
          <h2 id="wake-dune-pause-title">{copy.pauseLabel.toUpperCase()}</h2>
          <button type="button" onClick={resumeGame}>{copy.resume}</button>
          <button type="button" onClick={openExit}>{copy.exitLabel}</button>
          <div className="wake-dune-pause-languages" dir="ltr">
            <LanguageSwitcher lang={lang} />
          </div>
        </div>
      </div>}
      {exitOpen && <div className="wake-dune-modal" role="dialog" aria-modal="true" aria-labelledby="wake-dune-exit-title">
        <div><h2 id="wake-dune-exit-title">{copy.exitQuestion}</h2><p>{copy.exitWarning}</p><button type="button" onClick={closeExit}>{copy.stay}</button><button type="button" onClick={confirmExit}>{copy.exit}</button></div>
      </div>}
      {isMobileLandscape && <div className="wake-dune-orientation" role="status">
        <span aria-hidden="true"><SystemIcon kind="rotate" /></span>
        <strong>{copy.turnPortrait}</strong>
      </div>}
    </main>
  );
}
