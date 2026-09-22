import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { HumanEqualizerAudio } from "@/lib/shop/quests/sound-case-001/humanEqualizerAudio";
import type { EqualizerRecordingProgress } from "@/lib/shop/quests/sound-case-001/humanEqualizerAudio";
import { PausableEqualizerTimer } from "@/lib/shop/quests/sound-case-001/humanEqualizerTimer";
import {
  ANSWER_HELP_DELAY_MS,
  EQUALIZER_COUNTDOWN_MS,
  EQUALIZER_TIMING,
  INITIAL_EQUALIZER_STATE,
  TOTAL_EQUALIZER_EVENTS,
  getCompletedEqualizerEvents,
  getEqualizerEvent,
  getHostFaderResponse,
  isEqualizerRound,
  pickTrainingDistractor,
  reduceEqualizerGame,
} from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";
import type { DistractorId, EqualizerMode, EqualizerPosition, EqualizerState, EqualizerTempo } from "@/lib/shop/quests/sound-case-001/humanEqualizerGame";

const POSITION_ORDER: readonly EqualizerPosition[] = ["low", "mid", "high"];
const POSITION_TOP: Record<EqualizerPosition, number> = { high: 10, mid: 50, low: 90 };
const COUNTDOWN_SPEECH_LANG: Record<Lang, string> = { ru: "ru-RU", en: "en-US", he: "he-IL" };

function formatAudioTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function HumanPose({ pose }: { pose: EqualizerPosition }) {
  return (
    <svg className="human-equalizer__human" viewBox="0 0 160 190" role="img" aria-hidden="true">
      <g className={pose === "low" ? "is-active" : ""}>
        <circle cx="80" cy="67" r="19" />
        <path d="M80 88 L80 119 M80 96 L53 119 M80 96 L107 119 M80 119 L51 144 L76 164 M80 119 L109 144 L84 164" />
      </g>
      <g className={pose === "mid" ? "is-active" : ""}>
        <circle cx="80" cy="35" r="19" />
        <path d="M80 56 L80 117 M80 68 L49 100 M80 68 L111 100 M80 117 L60 167 M80 117 L100 167" />
      </g>
      <g className={pose === "high" ? "is-active" : ""}>
        <circle cx="80" cy="35" r="19" />
        <path d="M80 56 L80 117 M80 69 L48 27 M80 69 L112 27 M80 117 L60 167 M80 117 L100 167" />
      </g>
    </svg>
  );
}

function EqualizerBars({ state }: { state: EqualizerState }) {
  const active = state.eventStatus === "reacting" || state.eventStatus === "feedback";
  const signal = state.emittedSignal;
  return (
    <div
      className="human-equalizer__bars"
      data-zone={signal?.type === "target" ? signal.target : signal ? "distractor" : "idle"}
      data-active={active}
      aria-hidden="true"
    >
      {Array.from({ length: 21 }, (_, index) => <i key={index} />)}
    </div>
  );
}

type FaderProps = {
  state: EqualizerState;
  labels: Record<EqualizerPosition, string>;
  accessibleLabel: string;
  onPosition: (position: EqualizerPosition) => void;
};

function VerticalFader({ state, labels, accessibleLabel, onPosition }: FaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const pointerTop = useRef(50);
  const [dragTop, setDragTop] = useState<number | null>(null);
  const enabled = state.mode === "host" && state.eventStatus === "ready" && !state.isPaused;
  const top = dragTop ?? POSITION_TOP[state.visualFaderPosition];

  const readPointerTop = (clientY: number) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return 50;
    return Math.max(10, Math.min(90, ((clientY - bounds.top) / bounds.height) * 100));
  };
  const release = (pointerId: number, clientY?: number) => {
    if (activePointerId.current !== pointerId) return;
    activePointerId.current = null;
    const percent = clientY === undefined ? pointerTop.current : readPointerTop(clientY);
    const position = percent < 30 ? "high" : percent < 70 ? "mid" : "low";
    setDragTop(null);
    onPosition(position);
  };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const current = POSITION_ORDER.indexOf(state.visualFaderPosition);
    let next: EqualizerPosition | null = null;
    if (event.key === "ArrowUp") next = POSITION_ORDER[Math.min(2, current + 1)];
    if (event.key === "ArrowDown") next = POSITION_ORDER[Math.max(0, current - 1)];
    if (event.key === "Home") next = "low";
    if (event.key === "End") next = "high";
    if (event.key === "Enter" || event.key === " ") next = state.visualFaderPosition;
    if (next) {
      event.preventDefault();
      onPosition(next);
    }
  };
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerTop.current = readPointerTop(event.clientY);
    setDragTop(pointerTop.current);
  };

  return (
    <div className="human-equalizer__fader-wrap">
      <div className="human-equalizer__fader-labels" aria-hidden="true">
        <span>{labels.high}</span><span>{labels.mid}</span><span>{labels.low}</span>
      </div>
      <div
        ref={trackRef}
        className="human-equalizer__fader"
        role="slider"
        tabIndex={enabled ? 0 : -1}
        aria-label={accessibleLabel}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={POSITION_ORDER.indexOf(state.visualFaderPosition)}
        aria-valuetext={labels[state.visualFaderPosition]}
        aria-disabled={!enabled}
        data-draggable={enabled}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          if (enabled && activePointerId.current === event.pointerId) {
            pointerTop.current = readPointerTop(event.clientY);
            setDragTop(pointerTop.current);
          }
        }}
        onPointerUp={(event) => {
          release(event.pointerId, event.clientY);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => release(event.pointerId)}
        onKeyDown={handleKey}
      >
        <div className="human-equalizer__fader-groove" />
        <div className="human-equalizer__fader-knob" style={{ top: `${top}%` }}>
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

export function HumanEqualizerScene({ lang, recordingUrl, distractorUrls, parrotUrl }: { lang: Lang; recordingUrl: string; distractorUrls: Record<DistractorId, string>; parrotUrl: string }) {
  const text = dictionaries[lang].shop.soundCase.humanEqualizer;
  const [state, dispatch] = useReducer(reduceEqualizerGame, INITIAL_EQUALIZER_STATE);
  const [tempo, setTempo] = useState<EqualizerTempo>("calm");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [recordingBlocked, setRecordingBlocked] = useState(false);
  const [boomProgress, setBoomProgress] = useState<EqualizerRecordingProgress>({ currentTime: 0, duration: 0 });
  const audioRef = useRef<HumanEqualizerAudio | null>(null);
  const eventTimer = useRef(new PausableEqualizerTimer());
  const helpTimer = useRef(new PausableEqualizerTimer());
  const countdownTimer = useRef(new PausableEqualizerTimer());
  const spokenCountdownStep = useRef<EqualizerState["countdownStep"]>(null);
  const pausedRef = useRef(false);
  const previousTrainingDistractor = useRef<DistractorId | null>(null);
  const currentEvent = getEqualizerEvent(state);
  const activeRound = isEqualizerRound(state.phase) ? state.phase : null;

  useEffect(() => () => {
    eventTimer.current.clear();
    helpTimer.current.clear();
    countdownTimer.current.clear();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    audioRef.current?.dispose();
    audioRef.current = null;
  }, []);

  const fireEvent = useCallback(() => {
    const event = getEqualizerEvent(state);
    if (!event || state.eventStatus !== "ready" || state.isPaused) return;
    if (event.emittedSignal.type === "target") {
      void audioRef.current?.playTarget(event.emittedSignal.target);
    } else {
      void audioRef.current?.playDistractor(distractorUrls[event.emittedSignal.soundId]).catch(() => {
        // A failed remote sound must not freeze the timed game/feedback sequence.
      });
    }
    dispatch({ type: "fire-event" });
  }, [state, distractorUrls]);

  useEffect(() => {
    if (!activeRound) {
      eventTimer.current.clear();
      helpTimer.current.clear();
      return;
    }
    const timing = EQUALIZER_TIMING[tempo];
    const eventKey = `${activeRound}-${state.eventIndex}-${state.eventStatus}`;
    if (state.eventStatus === "ready" && state.mode === "parrot") {
      eventTimer.current.schedule(eventKey, timing.roundLeadMs[activeRound], fireEvent);
    } else if (state.eventStatus === "reacting") {
      eventTimer.current.schedule(eventKey, timing.reactionMs[activeRound], () => dispatch({ type: "reveal-feedback" }));
    } else if (state.eventStatus === "feedback") {
      eventTimer.current.schedule(eventKey, timing.feedbackMs[activeRound], () => dispatch({ type: "advance" }));
    } else {
      eventTimer.current.clear();
    }
    if (state.eventStatus === "reacting" && activeRound !== "round-1" && currentEvent?.emittedSignal.type === "target" && !state.helpShown) {
      helpTimer.current.schedule(eventKey, ANSWER_HELP_DELAY_MS, () => dispatch({ type: "show-help" }));
    } else helpTimer.current.clear();
  }, [activeRound, state.eventStatus, state.mode, state.eventIndex, state.helpShown, currentEvent, fireEvent, tempo]);

  const speakCountdown = useCallback((step: NonNullable<EqualizerState["countdownStep"]>) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.countdownVoice[step]);
      utterance.lang = COUNTDOWN_SPEECH_LANG[lang];
      utterance.rate = 0.95;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch { /* Visual countdown remains independent of the speech engine. */ }
  }, [lang, text.countdownVoice]);

  useEffect(() => {
    if (state.phase !== "countdown" || state.countdownStep === null) {
      countdownTimer.current.clear();
      if (spokenCountdownStep.current !== null) {
        window.speechSynthesis?.cancel();
        spokenCountdownStep.current = null;
      }
      return;
    }
    const step = state.countdownStep;
    if (spokenCountdownStep.current !== step) {
      spokenCountdownStep.current = step;
      speakCountdown(step);
    }
    countdownTimer.current.schedule(`countdown-${step}`, EQUALIZER_COUNTDOWN_MS[step], () => dispatch({ type: "countdown-next" }));
  }, [state.phase, state.countdownStep, speakCountdown]);

  useEffect(() => {
    if (state.phase !== "boom") return;
    setBoomProgress({ currentTime: 0, duration: 0 });
    setRecordingBlocked(false);
    void audioRef.current?.playRecording(
      () => dispatch({ type: "boom-finished" }),
      () => setRecordingBlocked(true),
      setBoomProgress,
    ).catch(() => { if (!pausedRef.current) setRecordingBlocked(true); });
    return () => { audioRef.current?.stopPlayback(); };
  }, [state.phase]);

  const pauseGame = () => {
    if (state.isPaused) return;
    pausedRef.current = true;
    eventTimer.current.pause();
    helpTimer.current.pause();
    audioRef.current?.pausePlayback();
    dispatch({ type: "pause" });
  };
  const resumeGame = () => {
    setShowExitConfirm(false);
    pausedRef.current = false;
    dispatch({ type: "resume" });
    eventTimer.current.resume();
    helpTimer.current.resume();
    void audioRef.current?.resumePlayback().catch(() => {
      if (state.phase === "boom") setRecordingBlocked(true);
    });
  };
  const exitGame = () => {
    setShowExitConfirm(false);
    eventTimer.current.clear();
    helpTimer.current.clear();
    countdownTimer.current.clear();
    window.speechSynthesis?.cancel();
    spokenCountdownStep.current = null;
    eventTimer.current.resume();
    helpTimer.current.resume();
    audioRef.current?.stopPlayback();
    pausedRef.current = false;
    setRecordingBlocked(false);
    setTempo("calm");
    dispatch({ type: "restart" });
  };
  const goBack = () => {
    if (state.phase === "instructions" || state.phase === "countdown") { exitGame(); return; }
    pauseGame();
    setShowExitConfirm(true);
  };

  const chooseMode = (mode: EqualizerMode) => {
    audioRef.current?.stopPlayback();
    dispatch({ type: "choose-mode", mode });
  };
  const start = () => {
    audioRef.current ??= new HumanEqualizerAudio(recordingUrl);
    void audioRef.current.unlock(); // Called directly from the user's start gesture.
    audioRef.current.stopPlayback();
    spokenCountdownStep.current = 3;
    speakCountdown(3);
    dispatch({ type: "start" });
  };
  const skipBoom = () => {
    audioRef.current?.stopPlayback();
    pausedRef.current = false;
    dispatch({ type: "skip-boom" });
  };
  const playTrainingTarget = (position: EqualizerPosition) => {
    audioRef.current ??= new HumanEqualizerAudio(recordingUrl);
    audioRef.current.playTarget(position);
  };
  const playTrainingRandom = () => {
    audioRef.current ??= new HumanEqualizerAudio(recordingUrl);
    const id = pickTrainingDistractor(previousTrainingDistractor.current);
    previousTrainingDistractor.current = id;
    void audioRef.current.playDistractor(distractorUrls[id]).catch(() => {
      // The practice card stays usable after a transient media failure.
    });
  };
  const selectPosition = (position: EqualizerPosition) => {
    if (!currentEvent || state.mode !== "host" || state.eventStatus !== "ready" || state.isPaused) return;
    dispatch({ type: "move-fader", position });
    const response = getHostFaderResponse(currentEvent, position);
    if (response.type === "fire-event") fireEvent();
    else audioRef.current?.playTarget(response.target);
  };
  const restart = exitGame;

  const completed = getCompletedEqualizerEvents(state);
  const roundIndex = activeRound === "round-1" ? 0 : activeRound === "round-2" ? 1 : 2;
  const feedback = state.eventStatus === "feedback" && currentEvent
    ? currentEvent.emittedSignal.type === "distractor"
      ? text.holdFeedback
      : text.poseLabels[currentEvent.emittedSignal.target]
    : null;
  const activeCue = state.eventStatus !== "ready" ? state.emittedSignal : null;
  const pauseOverlay = state.isPaused && !showExitConfirm ? (
    <div className="human-equalizer__pause-panel" role="status">
      <h2>{text.pausedTitle}</h2>
      <button className="human-equalizer__primary" type="button" onClick={resumeGame}>{text.resumeAction}</button>
      {state.phase === "boom" && <button className="human-equalizer__primary human-equalizer__boom-next" type="button" onClick={skipBoom}>{text.boomNextAction}</button>}
    </div>
  ) : null;

  return (
    <main className="human-equalizer" lang={lang} dir={lang === "he" ? "rtl" : "ltr"} data-phase={state.phase}>
      <div className="human-equalizer__shell">
        <header className="human-equalizer__header">
          <bdi dir="ltr">PARROT SOUND LAB</bdi>
          <span>{text.stageLabel}</span>
        </header>
        {(state.phase === "instructions" || state.phase === "countdown" || activeRound || state.phase === "boom") && (
          <nav className="human-equalizer__controls" aria-label={text.gameControlsLabel}>
            <button type="button" onClick={goBack}>{text.backAction}</button>
            {(activeRound || state.phase === "boom") && (
              <button type="button" onClick={state.isPaused ? resumeGame : pauseGame}>
                {state.isPaused ? text.resumeAction : text.pauseAction}
              </button>
            )}
          </nav>
        )}
        <h1>{text.title}</h1>

        {state.phase === "mode-selection" && (
          <section className="human-equalizer__intro">
            <div className="human-equalizer__parrot-intro">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={parrotUrl} alt="" aria-hidden="true" />
              <div>{text.parrotIntroLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>
            </div>
            <h2>{text.modeQuestion}</h2>
            <div className="human-equalizer__modes">
              <button className="human-equalizer__mode human-equalizer__mode--parrot" type="button" onClick={() => chooseMode("parrot")}>
                <strong>{text.parrotModeTitle}</strong><span>{text.parrotModeDescription}</span>
              </button>
              <button className="human-equalizer__mode human-equalizer__mode--host" type="button" onClick={() => chooseMode("host")}>
                <strong>{text.hostModeTitle}</strong><span>{text.hostModeDescription}</span>
              </button>
            </div>
          </section>
        )}

        {state.phase === "instructions" && (
          <section className="human-equalizer__instructions">
            <div className="human-equalizer__instructions-heading">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={parrotUrl} alt="" aria-hidden="true" />
              <h2>{text.instructionsTitle}</h2>
            </div>
            <p>{text.instructionsHint}</p>
            <p className="human-equalizer__listening-help">{text.listeningHelp}</p>
            <div className="human-equalizer__rules">
              <button type="button" onClick={() => playTrainingTarget("low")}><b>{text.signalLabels.low} ↓</b><strong>{text.poseLabels.low}</strong><span><span aria-hidden="true">▶</span> {text.previewAction}</span></button>
              <button type="button" onClick={() => playTrainingTarget("mid")}><b>{text.signalLabels.mid} •</b><strong>{text.poseLabels.mid}</strong><span><span aria-hidden="true">▶</span> {text.previewAction}</span></button>
              <button type="button" onClick={() => playTrainingTarget("high")}><b>{text.signalLabels.high} ↑</b><strong>{text.poseLabels.high}</strong><span><span aria-hidden="true">▶</span> {text.previewAction}</span></button>
              <button type="button" onClick={playTrainingRandom}><b>{text.unexpectedLabel} ✋</b><strong>{text.holdFeedback}</strong><span><span aria-hidden="true">▶</span> {text.previewAction}</span></button>
            </div>
            <fieldset className="human-equalizer__tempo">
              <legend>{text.tempoTitle}</legend>
              <label className={tempo === "calm" ? "is-selected" : ""}>
                <input type="radio" name="equalizer-tempo" checked={tempo === "calm"} onChange={() => setTempo("calm")} />
                <strong>{text.tempoCalmTitle}</strong><span>{text.tempoCalmDescription}</span>
              </label>
              <label className={tempo === "fast" ? "is-selected" : ""}>
                <input type="radio" name="equalizer-tempo" checked={tempo === "fast"} onChange={() => setTempo("fast")} />
                <strong>{text.tempoFastTitle}</strong><span>{text.tempoFastDescription}</span>
              </label>
            </fieldset>
            <p className="human-equalizer__mistake">{text.mistakeHint}</p>
            <button className="human-equalizer__primary" type="button" onClick={start}>{text.startAction}</button>
          </section>
        )}

        {state.phase === "countdown" && state.countdownStep !== null && (
          <section className="human-equalizer__countdown" aria-live="assertive" aria-label={text.countdownLabel}>
            {state.countdownStep === "start" ? (
              <div className="human-equalizer__countdown-start" key="start">
                <svg viewBox="0 0 120 150" role="img" aria-label={text.listenAction}>
                  <path d="M64 139c-10 0-16-6-16-16 0-13 10-21 18-29 9-8 18-17 18-33 0-20-14-34-32-34S20 42 20 61" />
                  <path d="M44 65c0-10 7-18 17-18s17 8 17 18c0 8-4 13-10 19-8 7-15 14-15 25" />
                  <path d="M95 30c7 9 11 20 11 33M15 23C7 33 4 46 4 60" />
                </svg>
                <strong>{text.countdownStart}</strong>
                <span>{text.listenAction}</span>
              </div>
            ) : <strong className="human-equalizer__countdown-number" key={state.countdownStep}>{state.countdownStep}</strong>}
          </section>
        )}

        {activeRound && currentEvent && (
          <section className="human-equalizer__game" aria-label={text.roundTitles[roundIndex]}>
            <div className="human-equalizer__hud">
              <span>ROUND {roundIndex + 1} / 3</span>
              <strong>{text.roundTitles[roundIndex]}</strong>
              <span>{text.progressLabel}: {completed} / {TOTAL_EQUALIZER_EVENTS}</span>
            </div>
            <div className="human-equalizer__progress" role="progressbar" aria-label={text.progressLabel} aria-valuemin={0} aria-valuemax={TOTAL_EQUALIZER_EVENTS} aria-valuenow={completed}>
              <i style={{ width: `${(completed / TOTAL_EQUALIZER_EVENTS) * 100}%` }} />
            </div>
            {activeRound === "round-3" && <p className="human-equalizer__broken">{text.brokenMessage}</p>}
            <p className="human-equalizer__prompt">
              {state.mode === "host" ? text.hostPrompt : text.parrotPrompt}
              {state.mode === "host" && state.eventStatus === "ready" && <strong> {text.signalLabels[currentEvent.visualPosition]}</strong>}
            </p>
            {activeCue && (
              <div className="human-equalizer__cue" data-zone={activeCue.type === "target" ? activeCue.target : "distractor"} role="status" aria-live="polite">
                <span aria-hidden="true">{activeCue.type === "target" ? { high: "↑", mid: "●", low: "↓" }[activeCue.target] : "✋"}</span>
                <strong>{activeCue.type === "target" ? text.cueLabels[activeCue.target] : text.holdCue}</strong>
              </div>
            )}
            <div className="human-equalizer__instrument" data-malfunction={currentEvent.emittedSignal.type === "distractor" && state.eventStatus !== "ready"} data-cue={activeCue?.type === "target" ? activeCue.target : "none"}>
              <EqualizerBars state={state} />
              <VerticalFader state={state} labels={text.signalLabels} accessibleLabel={text.faderLabel} onPosition={selectPosition} />
              <div className="human-equalizer__pose" data-help-visible={activeRound === "round-1" || state.eventStatus !== "reacting" || state.helpShown}>
                <HumanPose pose={state.humanPose} />
                <strong aria-live="polite">{feedback ?? (activeRound === "round-1" && state.eventStatus === "reacting" ? text.poseLabels[state.humanPose] : state.helpShown && activeCue?.type === "target" ? text.poseLabels[state.humanPose] : "")}</strong>
              </div>
            </div>
            {state.eventStatus === "feedback" && currentEvent.emittedSignal.type === "distractor" && currentEvent.emittedSignal.soundId === "splat" && (
              <p className="human-equalizer__malfunction">{text.malfunctionLabel}</p>
            )}
            {pauseOverlay}
          </section>
        )}

        {state.phase === "boom" && (
          <section className="human-equalizer__boom">
            <div className="human-equalizer__boom-wave" role="img" aria-label={text.boomWaveLabel}>
              {Array.from({ length: 11 }, (_, index) => <i key={index} />)}
            </div>
            <strong>{text.boom}</strong>
            <h2>{text.stop}</h2>
            {text.boomLines.map((line) => <p key={line}>{line}</p>)}
            <div className="human-equalizer__boom-player">
              <label htmlFor="equalizer-boom-seek">{text.boomAudioLabel}</label>
              <input
                id="equalizer-boom-seek"
                type="range"
                min={0}
                max={boomProgress.duration || 1}
                step={0.1}
                value={Math.min(boomProgress.currentTime, boomProgress.duration || 1)}
                disabled={boomProgress.duration <= 0}
                onChange={(event) => setBoomProgress(audioRef.current?.seekRecording(Number(event.target.value)) ?? boomProgress)}
              />
              <span dir="ltr">{formatAudioTime(boomProgress.currentTime)} / {formatAudioTime(boomProgress.duration)}</span>
            </div>
            {recordingBlocked && <button className="human-equalizer__primary" type="button" onClick={() => {
              setRecordingBlocked(false);
              void audioRef.current?.playRecording(
                () => dispatch({ type: "boom-finished" }),
                () => setRecordingBlocked(true),
                setBoomProgress,
              ).catch(() => setRecordingBlocked(true));
            }}>{text.recordingAction}</button>}
            <button className="human-equalizer__primary human-equalizer__boom-next" type="button" onClick={skipBoom}>{text.boomNextAction}</button>
            {pauseOverlay}
          </section>
        )}

        {state.phase === "clue-reveal" && (
          <section className="human-equalizer__clue">
            <span>{text.clueTitle}</span>
            <h2>{text.clueStatement}</h2>
            <strong>{text.clueExplanation}</strong>
            <div className="human-equalizer__clue-parrot">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={parrotUrl} alt="" aria-hidden="true" />
              <div className="human-equalizer__parrot-copy">{text.parrotClueLines.map((line) => <p key={line}>{line}</p>)}</div>
            </div>
            <section className="human-equalizer__next-step" aria-labelledby="equalizer-next-step-title">
              <h3 id="equalizer-next-step-title">{text.nextStepTitle}</h3>
              <p className="human-equalizer__transition">{text.physicalTransition}</p>
              <p className="human-equalizer__phone-away">{text.phoneAway}</p>
              <p>{text.physicalOnly}</p>
              <h4>{text.nextGameTitle}</h4>
              <ol>{text.nextGameSteps.map((step) => <li key={step}>{step}</li>)}</ol>
              <p>{text.rhythmSounds}</p>
              <p>{text.noSnapAlternative}</p>
              <h4>{text.materialsTitle}</h4>
              <ul>{text.materials.map((item) => <li key={item}>{item}</li>)}</ul>
              <strong>{text.envelopeWarning}</strong>
            </section>
            <button className="human-equalizer__replay" type="button" onClick={restart}>{text.replayAction}</button>
          </section>
        )}
        {showExitConfirm && (
          <div className="human-equalizer__dialog-shade">
            <div className="human-equalizer__dialog" role="dialog" aria-modal="true" aria-labelledby="equalizer-exit-title">
              <h2 id="equalizer-exit-title">{text.exitQuestion}</h2>
              <button className="human-equalizer__primary" type="button" onClick={resumeGame}>{text.continueGameAction}</button>
              <button className="human-equalizer__exit" type="button" onClick={exitGame}>{text.exitAction}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
