import { findStarInfo } from "@/utils/starInfo";
import { findStarNavigationTarget } from "./starNavigation";

// The SVG uses different IDs for these marker paths and their visible labels.
const MARKER_LABEL_IDS: Record<string, string> = {
  alioth: "Alioth",
  Kochab1: "Kochab",
  phecda: "Fekda",
};

/** Resolve a fact only for stars outside the three-step navigation route. */
export function getInformationalStarId(ids: readonly (string | null | undefined)[]): string | null {
  if (findStarNavigationTarget(ids)) return null;
  for (const id of ids) {
    if (!id) continue;
    const star = findStarInfo(MARKER_LABEL_IDS[id] ?? id);
    if (star) return star.id;
  }
  return null;
}

export function getInformationalStarIdAtPoint(host: Element, x: number, y: number): string | null {
  for (const hit of document.elementsFromPoint(x, y)) {
    if (!host.contains(hit)) continue;
    const ids: string[] = [];
    let current: Element | null = hit;
    while (current && current !== host) {
      if (current.id) ids.push(current.id);
      current = current.parentElement;
    }
    const starId = getInformationalStarId(ids);
    if (starId) return starId;
  }
  return null;
}
