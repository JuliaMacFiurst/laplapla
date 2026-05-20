import type { StudioSlide } from "@/types/studio";

export type StudioTextSafeLayout = {
  lines: string[];
  x: number;
  y: number;
  blockHeight: number;
  lineHeight: number;
  maxWidth: number;
  safeBottom: number;
};

export type StudioMediaSafeLayout = {
  offsetY: number;
  isVerticalMedia: boolean;
};

type TextMeasure = (text: string) => number;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function wrapStudioTextLines(text: string, maxWidth: number, measureText: TextMeasure) {
  return text
    .split("\n")
    .flatMap((rawLine) => {
      const words = rawLine.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (measureText(candidate) <= maxWidth || !currentLine) {
          currentLine = candidate;
          return;
        }

        lines.push(currentLine);
        currentLine = word;
      });

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines.length ? lines : [""];
    })
    .filter((line) => line.length > 0);
}

export function estimateStudioTextLines(text: string, fontSize: number, maxWidth: number) {
  return wrapStudioTextLines(text, maxWidth, (line) => line.length * fontSize * 0.56);
}

function getSafeBottom(canvasHeight: number, blockHeight: number, lineCount: number) {
  const scale = canvasHeight / 1920;
  const safeBottom1080 = blockHeight > canvasHeight * 0.13 || lineCount > 2
    ? 360
    : lineCount > 1
      ? 340
      : 300;

  return safeBottom1080 * scale;
}

function getTextX(_slide: StudioSlide, canvasWidth: number) {
  return canvasWidth / 2;
}

export function getStudioTextSafeLayout(params: {
  slide: StudioSlide;
  canvasWidth: number;
  canvasHeight: number;
  fontSize: number;
  lineHeight?: number;
  maxWidth?: number;
  measureText?: TextMeasure;
  offsetScale?: number;
  mediaAspectRatio?: number;
}) {
  const {
    slide,
    canvasWidth,
    canvasHeight,
    fontSize,
    lineHeight = fontSize * 1.12,
    maxWidth = canvasWidth * 0.92,
    measureText = (text) => text.length * fontSize * 0.56,
    offsetScale = 1,
  } = params;
  const lines = wrapStudioTextLines(slide.text || "", maxWidth, measureText);
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
  const safeBottom = getSafeBottom(canvasHeight, blockHeight, lines.length);
  const isBottomCaption = (slide.textPosition ?? "bottom") === "bottom";
  const baseY = slide.textPosition === "top"
    ? canvasHeight * 0.15
    : isBottomCaption
      ? canvasHeight - safeBottom - blockHeight / 2
      : canvasHeight * 0.56;
  const minY = canvasHeight * 0.08 + blockHeight / 2;
  const maxY = isBottomCaption
    ? canvasHeight - safeBottom - blockHeight / 2
    : canvasHeight - canvasHeight * 0.08 - blockHeight / 2;
  const y = clamp(baseY + (slide.textOffsetY ?? 0) * offsetScale, minY, Math.max(minY, maxY));

  return {
    lines,
    x: getTextX(slide, canvasWidth),
    y,
    blockHeight,
    lineHeight,
    maxWidth,
    safeBottom,
  } satisfies StudioTextSafeLayout;
}

export function getStudioMediaSafeLayout(params: {
  slide: StudioSlide;
  canvasWidth: number;
  canvasHeight: number;
  mediaAspectRatio: number;
  textLayout?: StudioTextSafeLayout;
  offsetScale?: number;
}) {
  const {
    slide,
    canvasWidth,
    canvasHeight,
    mediaAspectRatio,
    textLayout,
    offsetScale = 1,
  } = params;
  const safeAspectRatio = mediaAspectRatio > 0 ? mediaAspectRatio : 9 / 16;
  const isVerticalMedia = safeAspectRatio <= 0.78;

  if (!textLayout || isVerticalMedia || (slide.textPosition ?? "bottom") !== "bottom") {
    return { offsetY: 0, isVerticalMedia } satisfies StudioMediaSafeLayout;
  }

  const canvasAspectRatio = canvasWidth / canvasHeight;
  let frameHeight = canvasHeight;
  let frameTop = 0;

  if ((slide.mediaFit ?? "cover") === "contain") {
    if (safeAspectRatio > canvasAspectRatio) {
      frameHeight = canvasWidth / safeAspectRatio;
      frameTop = (canvasHeight - frameHeight) / 2;

      if ((slide.mediaPosition ?? "center") === "top") {
        frameTop = 0;
      } else if ((slide.mediaPosition ?? "center") === "bottom") {
        frameTop = canvasHeight - frameHeight;
      }
    }
  }

  const currentOffsetY = (slide.mediaOffsetY ?? 0) * offsetScale;
  const frameBottom = frameTop + frameHeight + currentOffsetY;
  const textTop = textLayout.y - textLayout.blockHeight / 2;
  const gap = canvasHeight * 0.035;
  const overlap = frameBottom + gap - textTop;

  if (overlap <= 0) {
    return { offsetY: 0, isVerticalMedia } satisfies StudioMediaSafeLayout;
  }

  const minTop = canvasHeight * 0.04;
  const maxUp = Math.max(0, frameTop + currentOffsetY - minTop);

  return {
    offsetY: -Math.min(overlap, maxUp),
    isVerticalMedia,
  } satisfies StudioMediaSafeLayout;
}
