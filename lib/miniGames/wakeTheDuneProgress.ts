export type WakeTheDunePhase = "ready" | "listen" | "handoff" | "play" | "failed" | "reward" | "celebration" | "listening" | "complete";
export type WakeTheDuneFailure = "early" | "late";
export type WakeTheDuneAccuracy = "perfect" | "great" | "good";

export type WakeTheDuneLevelResult = {
  rhythm: number;
  firstTry: number;
  levelBonus: number;
  total: number;
};

export type WakeTheDuneProgress = {
  levelIndex: number;
  phase: WakeTheDunePhase;
  nextBeat: number;
  failure: WakeTheDuneFailure | null;
  unlockedStems: number;
  attemptId: number;
  totalScore: number;
  attemptScore: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  attemptPerfectCount: number;
  attemptGreatCount: number;
  attemptGoodCount: number;
  attemptNumberForLevel: number;
  lastLevelResult: WakeTheDuneLevelResult | null;
  finalFailureCount: number;
  finalHintEnabled: boolean;
  finalHintNextOfferAt: number;
};

export const INITIAL_WAKE_THE_DUNE_PROGRESS: WakeTheDuneProgress = {
  levelIndex: 0,
  phase: "ready",
  nextBeat: 0,
  failure: null,
  unlockedStems: 0,
  attemptId: 0,
  totalScore: 0,
  attemptScore: 0,
  perfectCount: 0,
  greatCount: 0,
  goodCount: 0,
  attemptPerfectCount: 0,
  attemptGreatCount: 0,
  attemptGoodCount: 0,
  attemptNumberForLevel: 0,
  lastLevelResult: null,
  finalFailureCount: 0,
  finalHintEnabled: false,
  finalHintNextOfferAt: 3,
};

export type WakeTheDuneProgressAction =
  | { type: "begin-demo"; attemptId: number }
  | { type: "handoff"; attemptId: number }
  | { type: "begin-play"; attemptId: number }
  | { type: "hit"; attemptId: number; points: number; accuracy: WakeTheDuneAccuracy }
  | { type: "fail"; attemptId: number; failure: WakeTheDuneFailure }
  | { type: "reward"; attemptId: number }
  | { type: "enable-final-hint" }
  | { type: "decline-final-hint" }
  | { type: "celebrate" }
  | { type: "enter-listening" }
  | { type: "cancel-attempt"; attemptId: number }
  | { type: "advance"; totalLevels: number }
  | { type: "restart" };

export function reduceWakeTheDuneProgress(
  state: WakeTheDuneProgress,
  action: WakeTheDuneProgressAction,
): WakeTheDuneProgress {
  if (
    "attemptId" in action &&
    action.type !== "begin-demo" &&
    action.type !== "cancel-attempt" &&
    action.attemptId !== state.attemptId
  ) {
    return state;
  }
  switch (action.type) {
    case "begin-demo":
      if (action.attemptId <= state.attemptId) return state;
      return {
        ...state,
        phase: "listen",
        nextBeat: 0,
        failure: null,
        attemptId: action.attemptId,
        attemptScore: 0,
        attemptPerfectCount: 0,
        attemptGreatCount: 0,
        attemptGoodCount: 0,
        attemptNumberForLevel: state.attemptNumberForLevel + 1,
        lastLevelResult: null,
      };
    case "handoff":
      return state.phase === "listen" ? { ...state, phase: "handoff" } : state;
    case "begin-play":
      return state.phase === "handoff" ? { ...state, phase: "play", nextBeat: 0, failure: null } : state;
    case "hit":
      if (state.phase !== "play") return state;
      return {
        ...state,
        nextBeat: state.nextBeat + 1,
        attemptScore: state.attemptScore + action.points,
        attemptPerfectCount: state.attemptPerfectCount + (action.accuracy === "perfect" ? 1 : 0),
        attemptGreatCount: state.attemptGreatCount + (action.accuracy === "great" ? 1 : 0),
        attemptGoodCount: state.attemptGoodCount + (action.accuracy === "good" ? 1 : 0),
      };
    case "fail":
      return state.phase === "play" ? {
        ...state,
        phase: "failed",
        failure: action.failure,
        attemptScore: 0,
        attemptPerfectCount: 0,
        attemptGreatCount: 0,
        attemptGoodCount: 0,
        finalFailureCount: state.levelIndex === 7 ? state.finalFailureCount + 1 : state.finalFailureCount,
      } : state;
    case "reward": {
      if (state.phase !== "play") return state;
      const levelBonus = 250;
      const firstTry = state.attemptNumberForLevel === 1 ? 150 : 0;
      const earned = state.attemptScore + levelBonus + firstTry;
      return {
        ...state,
        phase: "reward",
        unlockedStems: Math.max(state.unlockedStems, state.levelIndex + 1),
        totalScore: state.totalScore + earned,
        perfectCount: state.perfectCount + state.attemptPerfectCount,
        greatCount: state.greatCount + state.attemptGreatCount,
        goodCount: state.goodCount + state.attemptGoodCount,
        attemptScore: 0,
        attemptPerfectCount: 0,
        attemptGreatCount: 0,
        attemptGoodCount: 0,
        lastLevelResult: { rhythm: state.attemptScore, firstTry, levelBonus, total: state.totalScore + earned },
      };
    }
    case "cancel-attempt":
      if (action.attemptId <= state.attemptId) return state;
      return {
        ...state,
        phase: "ready",
        nextBeat: 0,
        failure: null,
        attemptId: action.attemptId,
        attemptScore: 0,
        attemptPerfectCount: 0,
        attemptGreatCount: 0,
        attemptGoodCount: 0,
        attemptNumberForLevel: Math.max(0, state.attemptNumberForLevel - 1),
      };
    case "enable-final-hint":
      return state.levelIndex === 7 && state.phase === "failed"
        ? { ...state, finalHintEnabled: true }
        : state;
    case "decline-final-hint":
      return state.levelIndex === 7 && state.phase === "failed"
        ? { ...state, finalHintNextOfferAt: state.finalFailureCount + 2 }
        : state;
    case "celebrate":
      return state.levelIndex === 7 && state.phase === "reward" && state.unlockedStems === 8
        ? { ...state, phase: "celebration" }
        : state;
    case "enter-listening":
      return state.phase === "celebration" ? { ...state, phase: "listening" } : state;
    case "advance":
      if (state.phase !== "reward") return state;
      if (state.levelIndex >= action.totalLevels - 1) return { ...state, phase: "complete" };
      return {
        ...state,
        levelIndex: state.levelIndex + 1,
        phase: "ready",
        nextBeat: 0,
        failure: null,
        attemptScore: 0,
        attemptPerfectCount: 0,
        attemptGreatCount: 0,
        attemptGoodCount: 0,
        attemptNumberForLevel: 0,
        lastLevelResult: null,
        finalFailureCount: 0,
        finalHintEnabled: false,
        finalHintNextOfferAt: 3,
      };
    case "restart":
      return { ...INITIAL_WAKE_THE_DUNE_PROGRESS, attemptId: state.attemptId + 1 };
    default:
      return state;
  }
}
