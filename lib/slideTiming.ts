import type { StudioSlide } from "@/types/studio";

export const DEFAULT_SLIDE_DURATION_SEC = 3;

/**
 * Returns slide duration in seconds.
 * Priority:
 * 1) voiceDuration (if present and > 0)
 * 2) default duration (3 seconds)
 */
export function getSlideDurationSec(slide: StudioSlide): number {
  if (
    typeof slide.voiceDuration === "number" &&
    isFinite(slide.voiceDuration) &&
    slide.voiceDuration > 0
  ) {
    return slide.voiceDuration;
  }

  return DEFAULT_SLIDE_DURATION_SEC;
}
