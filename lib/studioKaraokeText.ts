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

export function getStudioWordTiming(params: {
  wordIndex: number;
  wordCount: number;
  durationMs: number;
}) {
  const { wordIndex, wordCount, durationMs } = params;
  const safeWordCount = Math.max(1, wordCount);
  const safeDurationMs = Math.max(650, durationMs);
  const wordDurationMs = safeDurationMs / safeWordCount;

  return {
    startMs: wordIndex * wordDurationMs,
    durationMs: Math.max(180, wordDurationMs * 1.45),
    color: HIGHLIGHT_COLORS[wordIndex % HIGHLIGHT_COLORS.length],
  };
}

export function getActiveStudioWordIndex(params: {
  elapsedMs: number;
  wordCount: number;
  durationMs: number;
}) {
  const { elapsedMs, wordCount, durationMs } = params;
  if (wordCount <= 0) return -1;

  const safeDurationMs = Math.max(650, durationMs);
  const progress = Math.min(0.999, Math.max(0, elapsedMs / safeDurationMs));
  return Math.min(wordCount - 1, Math.floor(progress * wordCount));
}

export function getStudioWordHighlightColor(wordIndex: number) {
  return HIGHLIGHT_COLORS[Math.max(0, wordIndex) % HIGHLIGHT_COLORS.length];
}
