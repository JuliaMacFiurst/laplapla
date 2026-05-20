import type { StudioSlide } from "@/types/studio";

export type StudioTextToken =
  | { kind: "word"; text: string; wordIndex: number }
  | { kind: "space"; text: string };

const HIGHLIGHT_COLORS = [
  "#ffb3d1",
  "#ffd166",
  "#98f0c5",
  "#8fdcff",
  "#c9b6ff",
  "#ff9f8f",
];

const SHORT_FUNCTION_WORDS = new Set([
  "a",
  "an",
  "as",
  "at",
  "by",
  "for",
  "i",
  "in",
  "is",
  "it",
  "my",
  "of",
  "oh",
  "on",
  "or",
  "so",
  "the",
  "to",
  "up",
  "we",
  "א",
  "או",
  "אז",
  "אל",
  "אם",
  "את",
  "ב",
  "גם",
  "זה",
  "כי",
  "לא",
  "לי",
  "מה",
  "על",
  "עם",
  "של",
  "а",
  "ах",
  "в",
  "да",
  "и",
  "к",
  "ли",
  "на",
  "не",
  "но",
  "ну",
  "о",
  "ой",
  "от",
  "по",
  "у",
  "я",
]);

export function getStudioSlideDurationMs(slide: StudioSlide) {
  return slide.voiceDuration && slide.voiceDuration > 0 ? slide.voiceDuration * 1000 : 3000;
}

export function tokenizeStudioText(text: string) {
  const tokens: StudioTextToken[] = [];
  let wordIndex = 0;

  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;

    if (/^\s+$/.test(part)) {
      tokens.push({ kind: "space", text: part });
      return;
    }

    tokens.push({ kind: "word", text: part, wordIndex });
    wordIndex += 1;
  });

  return tokens;
}

export function countStudioTextWords(text: string) {
  return tokenizeStudioText(text).filter((token) => token.kind === "word").length;
}

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function getStudioWordTimingWeight(word: string) {
  const normalized = normalizeWord(word);
  const length = Array.from(normalized).length;

  if (!normalized) return 0.7;
  if (SHORT_FUNCTION_WORDS.has(normalized)) return 0.68;
  if (length <= 2) return 0.74;
  if (length <= 4) return 0.88;
  if (length >= 13) return 1.62;
  if (length >= 10) return 1.44;
  if (length >= 8) return 1.26;

  return 1;
}

function getStudioWordWeights(wordTexts: string[]) {
  return wordTexts.map(getStudioWordTimingWeight);
}

function getStudioWordTimingModel(wordTexts: string[], durationMs: number) {
  const safeDurationMs = Math.max(650, durationMs);
  const weights = getStudioWordWeights(wordTexts);
  const totalWeight = Math.max(1, weights.reduce((total, weight) => total + weight, 0));
  const unitMs = safeDurationMs / totalWeight;

  return {
    safeDurationMs,
    weights,
    unitMs,
  };
}

export function getStudioWordTiming(params: {
  wordIndex: number;
  words?: string[];
  wordCount?: number;
  durationMs: number;
}) {
  const { wordIndex, durationMs } = params;
  const words = params.words?.length
    ? params.words
    : Array.from({ length: Math.max(1, params.wordCount ?? 1) }, () => "");
  const model = getStudioWordTimingModel(words, durationMs);
  const startWeight = model.weights
    .slice(0, Math.max(0, wordIndex))
    .reduce((total, weight) => total + weight, 0);
  const wordDurationMs = (model.weights[wordIndex] ?? 1) * model.unitMs;

  return {
    startMs: startWeight * model.unitMs,
    durationMs: Math.max(170, wordDurationMs * 1.42),
    color: HIGHLIGHT_COLORS[wordIndex % HIGHLIGHT_COLORS.length],
  };
}

export function getActiveStudioWordIndex(params: {
  elapsedMs: number;
  words?: string[];
  wordCount?: number;
  durationMs: number;
}) {
  const { elapsedMs, durationMs } = params;
  const words = params.words?.length
    ? params.words
    : Array.from({ length: Math.max(0, params.wordCount ?? 0) }, () => "");
  if (words.length <= 0) return -1;

  const model = getStudioWordTimingModel(words, durationMs);
  const clampedElapsed = Math.min(model.safeDurationMs - 1, Math.max(0, elapsedMs));
  let cursorMs = 0;

  for (let index = 0; index < words.length; index += 1) {
    cursorMs += (model.weights[index] ?? 1) * model.unitMs;
    if (clampedElapsed < cursorMs || index === words.length - 1) {
      return index;
    }
  }

  return words.length - 1;
}

export function getStudioWordHighlightColor(wordIndex: number) {
  return HIGHLIGHT_COLORS[Math.max(0, wordIndex) % HIGHLIGHT_COLORS.length];
}
