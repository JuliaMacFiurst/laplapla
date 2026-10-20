export type EqualizerPosition = "low" | "mid" | "high";
export type EqualizerMode = "parrot" | "host";
export type EqualizerRound = "round-1" | "round-2" | "round-3";
export type EqualizerTempo = "calm" | "fast";
export type EqualizerPhase = "mode-selection" | "instructions" | "countdown" | EqualizerRound | "boom" | "clue-reveal";
export type EqualizerCountdownStep = 3 | 2 | 1 | "start";

export const EQUALIZER_COUNTDOWN_MS: Record<EqualizerCountdownStep, number> = {
  3: 800,
  2: 800,
  1: 800,
  start: 700,
};

export const DISTRACTOR_IDS = [
  "cow", "duck", "cartoon-sneeze", "clown-horn", "squeaky-toy",
  "flute-whistle", "splat", "metal-smash", "cartoon-laugh", "rattle",
  "rubber-squeak", "trombone", "human-sneeze", "spinning-whistle",
] as const;
export type DistractorId = typeof DISTRACTOR_IDS[number];

export function pickTrainingDistractor(previous: DistractorId | null, random = Math.random): DistractorId {
  const choices = previous === null ? DISTRACTOR_IDS : DISTRACTOR_IDS.filter((id) => id !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

export type EmittedSignal =
  | { type: "target"; target: EqualizerPosition }
  | { type: "distractor"; soundId: DistractorId };

export type EqualizerEvent = {
  visualPosition: EqualizerPosition;
  emittedSignal: EmittedSignal;
};

export function getHostFaderResponse(event: EqualizerEvent, snappedPosition: EqualizerPosition) {
  return snappedPosition === event.visualPosition
    ? { type: "fire-event" as const }
    : { type: "preview-target" as const, target: snappedPosition };
}

const target = (position: EqualizerPosition): EqualizerEvent => ({
  visualPosition: position,
  emittedSignal: { type: "target", target: position },
});
const distractor = (visualPosition: EqualizerPosition, soundId: DistractorId): EqualizerEvent => ({
  visualPosition,
  emittedSignal: { type: "distractor", soundId },
});

export const EQUALIZER_ROUNDS: Record<EqualizerRound, readonly EqualizerEvent[]> = {
  "round-1": [
    target("high"), target("mid"), target("low"), target("mid"), target("high"),
    target("low"), target("low"), target("mid"), target("high"),
  ],
  "round-2": [
    target("low"), distractor("mid", "duck"), target("mid"),
    distractor("high", "cartoon-sneeze"), target("high"), distractor("low", "cow"),
    target("low"), distractor("mid", "clown-horn"), target("high"),
    distractor("low", "squeaky-toy"), target("mid"), distractor("high", "flute-whistle"),
    target("low"), distractor("mid", "rattle"), target("high"),
    distractor("low", "trombone"), target("mid"),
  ],
  "round-3": [
    target("mid"), target("high"), distractor("high", "splat"),
    target("low"), distractor("low", "duck"), target("high"),
    distractor("high", "cow"), target("mid"), distractor("mid", "cartoon-laugh"),
    target("low"), distractor("high", "rubber-squeak"), target("high"),
    distractor("high", "metal-smash"), target("mid"),
    distractor("low", "human-sneeze"),
    distractor("mid", "spinning-whistle"), target("low"),
  ],
};

export const ANSWER_HELP_DELAY_MS = 600;
export const EQUALIZER_TIMING = {
  fast: {
    roundLeadMs: { "round-1": 1000, "round-2": 600, "round-3": 350 },
    reactionMs: { "round-1": 1800, "round-2": 950, "round-3": 850 },
    feedbackMs: { "round-1": 1200, "round-2": 650, "round-3": 550 },
  },
  calm: {
    roundLeadMs: { "round-1": 1250, "round-2": 850, "round-3": 600 },
    reactionMs: { "round-1": 2100, "round-2": 1250, "round-3": 1150 },
    feedbackMs: { "round-1": 1450, "round-2": 900, "round-3": 800 },
  },
} as const;

export type EqualizerState = {
  phase: EqualizerPhase;
  mode: EqualizerMode | null;
  eventIndex: number;
  eventStatus: "ready" | "reacting" | "feedback";
  visualFaderPosition: EqualizerPosition;
  humanPose: EqualizerPosition;
  emittedSignal: EmittedSignal | null;
  isPaused: boolean;
  helpShown: boolean;
  countdownStep: EqualizerCountdownStep | null;
};

export const INITIAL_EQUALIZER_STATE: EqualizerState = {
  phase: "mode-selection",
  mode: null,
  eventIndex: 0,
  eventStatus: "ready",
  visualFaderPosition: "mid",
  humanPose: "mid",
  emittedSignal: null,
  isPaused: false,
  helpShown: false,
  countdownStep: null,
};

export type EqualizerAction =
  | { type: "choose-mode"; mode: EqualizerMode }
  | { type: "start" }
  | { type: "countdown-next" }
  | { type: "move-fader"; position: EqualizerPosition }
  | { type: "fire-event" }
  | { type: "reveal-feedback" }
  | { type: "advance" }
  | { type: "boom-finished" }
  | { type: "skip-boom" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "show-help" }
  | { type: "restart" };

export function isEqualizerRound(phase: EqualizerPhase): phase is EqualizerRound {
  return phase === "round-1" || phase === "round-2" || phase === "round-3";
}

export function getEqualizerEvent(state: EqualizerState): EqualizerEvent | null {
  return isEqualizerRound(state.phase) ? EQUALIZER_ROUNDS[state.phase][state.eventIndex] ?? null : null;
}

export function reduceEqualizerGame(state: EqualizerState, action: EqualizerAction): EqualizerState {
  if (action.type === "restart") return { ...INITIAL_EQUALIZER_STATE };
  if (action.type === "skip-boom") return state.phase === "boom"
    ? { ...state, phase: "clue-reveal", isPaused: false }
    : state;
  if (action.type === "resume") return state.isPaused ? { ...state, isPaused: false } : state;
  if (action.type === "pause") return !state.isPaused && (isEqualizerRound(state.phase) || state.phase === "boom")
    ? { ...state, isPaused: true } : state;
  if (state.isPaused) return state;
  if (action.type === "choose-mode") {
    return state.phase === "mode-selection"
      ? { ...INITIAL_EQUALIZER_STATE, phase: "instructions", mode: action.mode }
      : state;
  }
  if (action.type === "start") {
    return state.phase === "instructions" && state.mode
      ? { ...state, phase: "countdown", countdownStep: 3, eventIndex: 0, eventStatus: "ready" }
      : state;
  }
  if (action.type === "countdown-next" && state.phase === "countdown") {
    if (state.countdownStep === 3) return { ...state, countdownStep: 2 };
    if (state.countdownStep === 2) return { ...state, countdownStep: 1 };
    if (state.countdownStep === 1) return { ...state, countdownStep: "start" };
    if (state.countdownStep === "start") return { ...state, phase: "round-1", countdownStep: null };
  }
  if (action.type === "move-fader") {
    return isEqualizerRound(state.phase) && state.mode === "host" && state.eventStatus === "ready"
      ? { ...state, visualFaderPosition: action.position }
      : state;
  }
  if (action.type === "fire-event") {
    const event = getEqualizerEvent(state);
    if (!event || state.eventStatus !== "ready") return state;
    return {
      ...state,
      eventStatus: "reacting",
      visualFaderPosition: event.visualPosition,
      emittedSignal: event.emittedSignal,
      helpShown: state.phase === "round-1" && event.emittedSignal.type === "target",
      // Training teaches the pose together with the sound. Later rounds delay it.
      humanPose: state.phase === "round-1" ? event.visualPosition : state.humanPose,
    };
  }
  if (action.type === "show-help") {
    const event = getEqualizerEvent(state);
    return state.eventStatus === "reacting" && state.phase !== "round-1" && event?.emittedSignal.type === "target"
      ? { ...state, humanPose: event.emittedSignal.target, helpShown: true }
      : state;
  }
  if (action.type === "reveal-feedback") {
    const event = getEqualizerEvent(state);
    if (!event || state.eventStatus !== "reacting") return state;
    return {
      ...state,
      eventStatus: "feedback",
      humanPose: event.emittedSignal.type === "target" ? event.emittedSignal.target : state.humanPose,
      helpShown: event.emittedSignal.type === "target",
    };
  }
  if (action.type === "advance") {
    if (!isEqualizerRound(state.phase) || state.eventStatus !== "feedback") return state;
    if (state.eventIndex + 1 < EQUALIZER_ROUNDS[state.phase].length) {
      return { ...state, eventIndex: state.eventIndex + 1, eventStatus: "ready", emittedSignal: null, helpShown: false };
    }
    const nextPhase = state.phase === "round-1" ? "round-2" : state.phase === "round-2" ? "round-3" : "boom";
    return { ...state, phase: nextPhase, eventIndex: 0, eventStatus: "ready", emittedSignal: null, helpShown: false };
  }
  if (action.type === "boom-finished") {
    return state.phase === "boom" ? { ...state, phase: "clue-reveal" } : state;
  }
  return state;
}

export const TOTAL_EQUALIZER_EVENTS = Object.values(EQUALIZER_ROUNDS)
  .reduce((total, round) => total + round.length, 0);

export function getCompletedEqualizerEvents(state: EqualizerState): number {
  if (state.phase === "boom" || state.phase === "clue-reveal") return TOTAL_EQUALIZER_EVENTS;
  if (!isEqualizerRound(state.phase)) return 0;
  const prior = state.phase === "round-1" ? 0
    : state.phase === "round-2" ? EQUALIZER_ROUNDS["round-1"].length
      : EQUALIZER_ROUNDS["round-1"].length + EQUALIZER_ROUNDS["round-2"].length;
  return prior + state.eventIndex + (state.eventStatus === "feedback" ? 1 : 0);
}
