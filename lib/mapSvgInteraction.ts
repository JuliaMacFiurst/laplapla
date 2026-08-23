type SvgBox = {
  width: number;
  height: number;
};

export type MobileTouchMapType =
  | "country"
  | "river"
  | "sea"
  | "physic"
  | "flag"
  | "animal"
  | "culture"
  | "weather"
  | "food";

export type MobileProximityCandidate<T> = {
  target: T;
  distance: number;
  area: number;
};

const MOBILE_TOUCH_TOLERANCE_PX = 20;
const SMALL_TARGET_TIE_PX = 2;
const MOBILE_TOUCH_TOLERANCE_TYPES = new Set<MobileTouchMapType>([
  "country",
  "sea",
  "flag",
  "culture",
  "food",
]);

export function getMobileTouchTolerance(type: MobileTouchMapType): number {
  return MOBILE_TOUCH_TOLERANCE_TYPES.has(type)
    ? MOBILE_TOUCH_TOLERANCE_PX
    : 0;
}

export function getRadialTouchSampleOffsets(radius: number) {
  const radii = [0.4, 0.7, 1].map((ratio) => radius * ratio);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2],
    [-Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, -Math.SQRT1_2],
  ] as const;

  return radii.flatMap((sampleRadius) =>
    directions.map(([x, y]) => ({
      x: x * sampleRadius,
      y: y * sampleRadius,
      distance: sampleRadius,
    })),
  );
}

export function selectMobileProximityTarget<T>(
  candidates: readonly MobileProximityCandidate<T>[],
  tolerance: number,
): T | null {
  let selected: MobileProximityCandidate<T> | null = null;

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.distance) || candidate.distance > tolerance) {
      continue;
    }

    if (
      !selected ||
      candidate.distance < selected.distance - SMALL_TARGET_TIE_PX ||
      (Math.abs(candidate.distance - selected.distance) <= SMALL_TARGET_TIE_PX &&
        candidate.area < selected.area)
    ) {
      selected = candidate;
    }
  }

  return selected?.target ?? null;
}

export function selectMobileTouchTarget<T>(
  exactTarget: T | null,
  proximityCandidates: readonly MobileProximityCandidate<T>[],
  tolerance: number,
): T | null {
  return (
    exactTarget ??
    selectMobileProximityTarget(proximityCandidates, tolerance)
  );
}

export function isMobileTouchTapEligible(params: {
  isMobile: boolean;
  moved: boolean;
  pinching: boolean;
}): boolean {
  return params.isMobile && !params.moved && !params.pinching;
}

export function selectSmallestSvgHit<T>(
  candidates: readonly T[],
  getBox: (candidate: T) => SvgBox,
): T | null {
  let selected: T | null = null;
  let selectedArea = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const box = getBox(candidate);
    const area = Math.max(0, box.width) * Math.max(0, box.height);
    if (area < selectedArea) {
      selected = candidate;
      selectedArea = area;
    }
  }

  return selected;
}

export function selectFirstInteractiveViewportHit<TElement, TPath>(
  elements: readonly TElement[],
  resolvePath: (element: TElement) => TPath | null,
  isInteractive: (path: TPath) => boolean,
): TPath | null {
  for (const element of elements) {
    const path = resolvePath(element);
    if (path && isInteractive(path)) {
      return path;
    }
  }

  return null;
}
