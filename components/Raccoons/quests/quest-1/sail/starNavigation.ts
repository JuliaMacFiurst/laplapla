import type { Lang } from "@/i18n";

export type StarNavigationTarget = "merak" | "dubhe" | "polaris";
export type StarNavigationPhase = "find_merak" | "find_dubhe" | "find_polaris" | "completed";

export const STAR_MAPS = {
  ru: { source: "supabase", path: "north-stars/north-stars.svg" },
  en: { source: "r2", path: "quests/quest-1/maps/north-stars-en.svg" },
  he: { source: "r2", path: "quests/quest-1/maps/north-stars-en.svg" },
} as const;

export function getStarMap(lang: Lang) {
  return STAR_MAPS[lang] ?? STAR_MAPS.ru;
}

const STAR_TARGET_ALIASES: Record<StarNavigationTarget, ReadonlySet<string>> = {
  merak: new Set(["merak", "merak-star"]),
  dubhe: new Set(["dubhe", "dubhe-star"]),
  polaris: new Set(["polaris", "polar-star"]),
};

export function normalizeStarNavigationTarget(id: string | null | undefined): StarNavigationTarget | null {
  const normalized = id?.trim().toLocaleLowerCase("en-US");
  if (!normalized) return null;
  for (const target of Object.keys(STAR_TARGET_ALIASES) as StarNavigationTarget[]) {
    if (STAR_TARGET_ALIASES[target].has(normalized)) return target;
  }
  return null;
}

export function findStarNavigationTarget(ids: readonly (string | null | undefined)[]): StarNavigationTarget | null {
  for (const id of ids) {
    const target = normalizeStarNavigationTarget(id);
    if (target) return target;
  }
  return null;
}

export function advanceStarNavigation(phase: StarNavigationPhase, target: StarNavigationTarget | null): StarNavigationPhase {
  if (phase === "find_merak" && target === "merak") return "find_dubhe";
  if (phase === "find_dubhe" && target === "dubhe") return "find_polaris";
  if (phase === "find_polaris" && target === "polaris") return "completed";
  return phase;
}

type AffineMatrix = Pick<DOMMatrix, "a" | "b" | "c" | "d" | "e" | "f">;
export type StarPoint = { x: number; y: number };

// Convert the marker's own SVG geometry through its rendered matrix, then back
// into the root SVG's user coordinates. This includes viewBox, nested transforms,
// responsive scaling, CSS transforms, zoom and RTL layout without pixel offsets.
export function projectMarkerCenter(center: StarPoint, marker: AffineMatrix, root: AffineMatrix): StarPoint {
  const screenX = marker.a * center.x + marker.c * center.y + marker.e;
  const screenY = marker.b * center.x + marker.d * center.y + marker.f;
  const dx = screenX - root.e;
  const dy = screenY - root.f;
  const determinant = root.a * root.d - root.b * root.c;
  if (!determinant) throw new Error("Star map has a non-invertible SVG transform");
  return {
    x: (root.d * dx - root.c * dy) / determinant,
    y: (-root.b * dx + root.a * dy) / determinant,
  };
}

const MARKER_IDS = ["Merak-Star", "Dubhe-Star", "Polar-Star"] as const;

export function getStarCenters(svg: SVGSVGElement): StarPoint[] | null {
  const rootMatrix = svg.getScreenCTM();
  if (!rootMatrix) return null;
  const centers: StarPoint[] = [];
  for (const id of MARKER_IDS) {
    const marker = svg.querySelector(`[id="${id}"]`) as SVGGraphicsElement | null;
    const markerMatrix = marker?.getScreenCTM();
    if (!marker || !markerMatrix) return null;
    const box = marker.getBBox();
    centers.push(projectMarkerCenter({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, markerMatrix, rootMatrix));
  }
  return centers;
}

export function getNavigationPathData(centers: readonly StarPoint[], phase: "idle" | StarNavigationPhase): string {
  if (centers.length < 3 || (phase !== "find_polaris" && phase !== "completed")) return "";
  const points = phase === "completed" ? centers : centers.slice(0, 2);
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

export function drawStarNavigationLine(svg: SVGSVGElement, phase: "idle" | StarNavigationPhase) {
  svg.querySelector('[data-star-navigation-line="true"]')?.remove();
  const centers = getStarCenters(svg);
  if (!centers) return;
  const d = getNavigationPathData(centers, phase);
  if (!d) return;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("data-star-navigation-line", "true");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#facc15");
  path.setAttribute("stroke-width", String(svg.viewBox.baseVal.width / 400));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("pointer-events", "none");
  svg.append(path);
}
