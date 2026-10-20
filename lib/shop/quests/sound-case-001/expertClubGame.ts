export type ExpertClubMode = "cooperative" | "teams";
export type ExpertClubChallenge = "round1" | "bonus" | "round2";
export type ExpertClubResponder = "group" | "a" | "b";
export type ExpertClubStep =
  | "setup" | "intro"
  | "round-1-setup" | "round-1-question" | "round-1-attempt" | "round-1-reveal"
  | "bonus-setup" | "bonus-question" | "bonus-attempt" | "bonus-reveal"
  | "round-2-setup" | "round-2-question" | "round-2-attempt" | "round-2-reveal"
  | "celebration" | "physical-handoff";

type AttemptResults = Partial<Record<ExpertClubResponder, boolean>>;
export type ExpertClubState = {
  step: ExpertClubStep;
  mode: ExpertClubMode | null;
  groupName: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  cooperativeSolved: number;
  attempts: Record<ExpertClubChallenge, AttemptResults>;
  answers: Record<ExpertClubChallenge, Partial<Record<ExpertClubResponder, string>>>;
  rouletteSelections: Partial<Record<ExpertClubChallenge, "a" | "b">>;
  activeResponder: ExpertClubResponder | null;
  responderQueue: ExpertClubResponder[];
  pendingAnswer: string | null;
  pendingCorrect: boolean | null;
  awaitingSecondTeam: boolean;
};

const emptyAttempts = (): Record<ExpertClubChallenge, AttemptResults> => ({ round1: {}, bonus: {}, round2: {} });
const emptyAnswers = (): Record<ExpertClubChallenge, Partial<Record<ExpertClubResponder, string>>> => ({ round1: {}, bonus: {}, round2: {} });
export const INITIAL_EXPERT_CLUB_STATE: ExpertClubState = {
  step: "setup", mode: null, groupName: "", teamAName: "", teamBName: "", scoreA: 0, scoreB: 0,
  cooperativeSolved: 0, attempts: emptyAttempts(), answers: emptyAnswers(), rouletteSelections: {}, activeResponder: null, responderQueue: [],
  pendingAnswer: null, pendingCorrect: null, awaitingSecondTeam: false,
};

export type ExpertClubAction =
  | { type: "configure"; mode: ExpertClubMode; groupName?: string; teamAName?: string; teamBName?: string }
  | { type: "advance" }
  | { type: "begin-answer"; responders: ExpertClubResponder[] }
  | { type: "select-answer"; answer: string }
  | { type: "select-correctness"; correct: boolean }
  | { type: "select-roulette"; challenge: ExpertClubChallenge; responder: "a" | "b" }
  | { type: "confirm-attempt" }
  | { type: "resume-other-team" }
  | { type: "skip-other-team" }
  | { type: "restore"; state: ExpertClubState }
  | { type: "restart" };

const CHALLENGE_BY_STEP: Partial<Record<ExpertClubStep, ExpertClubChallenge>> = {
  "round-1-question": "round1", "round-1-attempt": "round1",
  "bonus-question": "bonus", "bonus-attempt": "bonus",
  "round-2-question": "round2", "round-2-attempt": "round2",
};
const QUESTION_STEP: Record<ExpertClubChallenge, ExpertClubStep> = { round1: "round-1-question", bonus: "bonus-question", round2: "round-2-question" };
const ATTEMPT_STEP: Record<ExpertClubChallenge, ExpertClubStep> = { round1: "round-1-attempt", bonus: "bonus-attempt", round2: "round-2-attempt" };
const REVEAL_STEP: Record<ExpertClubChallenge, ExpertClubStep> = { round1: "round-1-reveal", bonus: "bonus-reveal", round2: "round-2-reveal" };
const NEXT_STEP: Partial<Record<ExpertClubStep, ExpertClubStep>> = {
  intro: "round-1-setup", "round-1-setup": "round-1-question", "round-1-reveal": "bonus-setup",
  "bonus-setup": "bonus-question", "bonus-reveal": "round-2-setup", "round-2-setup": "round-2-question",
  "round-2-reveal": "celebration", celebration: "physical-handoff",
};

export function reduceExpertClub(state: ExpertClubState, action: ExpertClubAction): ExpertClubState {
  if (action.type === "restart") return INITIAL_EXPERT_CLUB_STATE;
  if (action.type === "restore") return action.state;
  if (action.type === "configure" && state.step === "setup") return {
    ...INITIAL_EXPERT_CLUB_STATE, step: "intro", mode: action.mode, groupName: action.groupName?.trim() || "",
    teamAName: action.teamAName?.trim() || "", teamBName: action.teamBName?.trim() || "",
  };
  if (action.type === "advance") {
    const next = NEXT_STEP[state.step];
    return next ? { ...state, step: next } : state;
  }
  if (action.type === "select-roulette" && state.step === QUESTION_STEP[action.challenge] && state.mode === "teams" && !state.rouletteSelections[action.challenge]) {
    return { ...state, rouletteSelections: { ...state.rouletteSelections, [action.challenge]: action.responder } };
  }
  const challenge = CHALLENGE_BY_STEP[state.step];
  if (!challenge) return state;
  if (action.type === "begin-answer" && state.step === QUESTION_STEP[challenge]) {
    const responders = action.responders.filter(responder => state.attempts[challenge][responder] === undefined);
    if (!responders.length) return state;
    return { ...state, step: ATTEMPT_STEP[challenge], activeResponder: responders[0], responderQueue: responders.slice(1), pendingAnswer: null, pendingCorrect: null, awaitingSecondTeam: false };
  }
  if (action.type === "select-answer" && state.step === ATTEMPT_STEP[challenge]) {
    const pendingCorrect = challenge === "round1" ? action.answer === "metal-detector" : challenge === "round2" ? action.answer === "C" : state.pendingCorrect;
    return { ...state, pendingAnswer: action.answer, pendingCorrect };
  }
  if (action.type === "select-correctness" && state.step === ATTEMPT_STEP[challenge]) return { ...state, pendingCorrect: action.correct };
  if (action.type === "confirm-attempt" && state.step === ATTEMPT_STEP[challenge] && state.activeResponder && state.pendingCorrect !== null) {
    const responder = state.activeResponder;
    const attempts = { ...state.attempts, [challenge]: { ...state.attempts[challenge], [responder]: state.pendingCorrect } };
    const answers = state.pendingAnswer ? { ...state.answers, [challenge]: { ...state.answers[challenge], [responder]: state.pendingAnswer } } : state.answers;
    const score = state.pendingCorrect ? responder === "a" ? { scoreA: state.scoreA + 1 } : responder === "b" ? { scoreB: state.scoreB + 1 } : { cooperativeSolved: state.cooperativeSolved + 1 } : {};
    if (state.responderQueue.length) return { ...state, ...score, attempts, answers, activeResponder: state.responderQueue[0], responderQueue: state.responderQueue.slice(1), pendingAnswer: null, pendingCorrect: null };
    if (state.pendingCorrect || state.mode === "cooperative") return { ...state, ...score, attempts, answers, step: REVEAL_STEP[challenge], activeResponder: null, pendingAnswer: null, pendingCorrect: null };
    const other = responder === "a" ? "b" : "a";
    if (attempts[challenge][other] === undefined) return { ...state, ...score, attempts, answers, activeResponder: null, pendingAnswer: null, pendingCorrect: null, awaitingSecondTeam: true };
    return { ...state, ...score, attempts, answers, step: REVEAL_STEP[challenge], activeResponder: null, pendingAnswer: null, pendingCorrect: null };
  }
  if (action.type === "resume-other-team" && state.awaitingSecondTeam) return { ...state, step: QUESTION_STEP[challenge], awaitingSecondTeam: false };
  if (action.type === "skip-other-team" && state.awaitingSecondTeam) return { ...state, step: REVEAL_STEP[challenge], awaitingSecondTeam: false };
  return state;
}

export const EXPERT_CLUB_STORAGE_KEY = "laplapla:sound-case-001:stage-07:v2";

export type Round1RevealKind = "correct" | "butt" | "other" | "unanswered";

export function getLatestChallengeAnswer(state: ExpertClubState, challenge: ExpertClubChallenge): string | null {
  const values = Object.values(state.answers[challenge]).filter((answer): answer is string => Boolean(answer));
  return values.at(-1) || null;
}

export function getRound1RevealKind(state: ExpertClubState): Round1RevealKind {
  const answers = Object.values(state.answers.round1);
  if (answers.includes("metal-detector")) return "correct";
  const latest = getLatestChallengeAnswer(state, "round1");
  if (latest === "human-butt") return "butt";
  return latest ? "other" : "unanswered";
}

export function getTimerExpiryMode(mode: ExpertClubMode): "roulette" | "group-answer" {
  return mode === "teams" ? "roulette" : "group-answer";
}

const VALID_STEPS = new Set<ExpertClubStep>(["setup", "intro", "round-1-setup", "round-1-question", "round-1-attempt", "round-1-reveal", "bonus-setup", "bonus-question", "bonus-attempt", "bonus-reveal", "round-2-setup", "round-2-question", "round-2-attempt", "round-2-reveal", "celebration", "physical-handoff"]);
export function parseStoredExpertClubState(value: string | null): ExpertClubState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ExpertClubState>;
    if (!parsed || typeof parsed !== "object" || !parsed.step || !VALID_STEPS.has(parsed.step)) return null;
    if (parsed.mode !== "cooperative" && parsed.mode !== "teams") return null;
    return { ...INITIAL_EXPERT_CLUB_STATE, ...parsed, attempts: { ...emptyAttempts(), ...(parsed.attempts || {}) }, answers: { ...emptyAnswers(), ...(parsed.answers || {}) }, rouletteSelections: parsed.rouletteSelections || {}, responderQueue: parsed.responderQueue || [] };
  } catch { return null; }
}
