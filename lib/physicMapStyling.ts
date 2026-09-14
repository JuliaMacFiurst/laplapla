import { selectSmallestSvgHit } from "@/lib/mapSvgInteraction";

export type PhysicPathLevel = "island" | "local-group" | "regional-group" | "other";

type SvgBox = { width: number; height: number };

const REGIONAL_GROUP_IDS = new Set([
  "Island group SVALBARD",
  "Island group WEST INDIES",
  "Island group QUEEN ELIZABETH ISLANDS",
  "Island group KIRIBATI",
  "Island group GREATER SUNDA ISLANDS",
  "Island group PHILIPPINES",
  "Island group ARCTIC ARCHIPELAGO",
  "Island group MELANESIA",
  "Island group MICRONESIA",
  "Island group MALAY ARCHIPELAGO",
  "Island group POLYNESIA",
]);

const ISLAND_FILLS = [
  "#FFE9BB", "#E8C88F", "#F7D39B", "#DAB780",
  "#F2DDA7", "#E5B789", "#F8E3C2", "#D9C396",
] as const;

const LEVEL_PRIORITY: Record<PhysicPathLevel, number> = {
  island: 0,
  "local-group": 1,
  "regional-group": 2,
  other: 3,
};

export function classifyPhysicPath(id: string): PhysicPathLevel {
  if (id.startsWith("Island group ")) {
    return REGIONAL_GROUP_IDS.has(id) ? "regional-group" : "local-group";
  }
  return id.startsWith("Island ") ? "island" : "other";
}

function stableIslandFill(id: string, d: string): string {
  // FNV-1a keeps duplicate IDs with different geometry stable without a runtime manifest.
  let hash = 0x811c9dc5;
  for (const char of `${id}|${d}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  }
  return ISLAND_FILLS[(hash >>> 0) % ISLAND_FILLS.length];
}

/** Move only target nodes between their existing slots; every other node keeps its slot. */
export function orderPhysicPathNodes<T>(nodes: readonly T[], getId: (node: T) => string | null): T[] {
  const targets = nodes
    .map((node, index) => ({ node, index, level: classifyPhysicPath(getId(node) ?? "") }))
    .filter(({ level }) => level !== "other")
    .sort((a, b) => LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level] || a.index - b.index);
  let targetIndex = 0;
  return nodes.map((node) => classifyPhysicPath(getId(node) ?? "") === "other"
    ? node
    : targets[targetIndex++].node);
}

export function applyPhysicMapStyling(svg: SVGSVGElement): void {
  const sourceGroup = svg.querySelector("g#wonders_filtered_minified");
  if (!sourceGroup) return;

  for (const child of Array.from(sourceGroup.children)) {
    if (child.localName !== "path") continue;
    const path = child as SVGPathElement;
    const level = classifyPhysicPath(path.getAttribute("id") ?? "");
    if (level === "island") {
      path.style.setProperty("fill", stableIslandFill(path.id, path.getAttribute("d") ?? ""));
      path.style.setProperty("opacity", "1");
      path.style.setProperty("stroke", "#A48255");
      path.style.setProperty("stroke-width", "0.25");
    } else if (level === "local-group") {
      path.style.setProperty("fill", "#E4D0AB");
      path.style.setProperty("opacity", "0.45");
      path.style.setProperty("stroke", "#B49B73");
      path.style.setProperty("stroke-width", "0.25");
    } else if (level === "regional-group") {
      path.style.setProperty("fill", "#D5C6A9");
      path.style.setProperty("fill-opacity", "0.12");
      path.style.setProperty("stroke", "#A48B68");
      path.style.setProperty("stroke-opacity", "0.55");
      path.style.setProperty("stroke-width", "0.4");
    }
  }

  const nodes = Array.from(sourceGroup.childNodes);
  const ordered = orderPhysicPathNodes(nodes, (node) =>
    node.nodeType === 1 && (node as Element).localName === "path"
      ? (node as Element).getAttribute("id")
      : null);
  sourceGroup.replaceChildren(...ordered);
}

export type PhysicHitSelection<T> = {
  selected: T | null;
  reason: string;
};

export function selectPhysicSvgHit<T extends { id: string }>(
  hits: readonly T[],
  getBox: (path: T) => SvgBox,
): PhysicHitSelection<T> {
  if (!hits.length) return { selected: null, reason: "no geometry hit" };
  const bestPriority = Math.min(...hits.map((path) => LEVEL_PRIORITY[classifyPhysicPath(path.id)]));
  const sameLevel = hits.filter((path) => LEVEL_PRIORITY[classifyPhysicPath(path.id)] === bestPriority);
  const selected = selectSmallestSvgHit(sameLevel, getBox);
  const level = selected ? classifyPhysicPath(selected.id) : "other";
  return {
    selected,
    reason: `${level} priority${sameLevel.length > 1 ? "; smallest bbox within level" : ""}`,
  };
}

/** Weather retains its existing smallest-bbox behavior. */
export function selectBiomeSvgHit<T extends { id: string }>(
  type: "physic" | "weather",
  hits: readonly T[],
  getBox: (path: T) => SvgBox,
): PhysicHitSelection<T> {
  if (type === "physic") return selectPhysicSvgHit(hits, getBox);
  return { selected: selectSmallestSvgHit(hits, getBox), reason: "smallest bbox" };
}
