type SvgBox = {
  width: number;
  height: number;
};

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
