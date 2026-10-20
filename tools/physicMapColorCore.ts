import { createHash } from "node:crypto";

export type Box = { x: number; y: number; width: number; height: number };
export type Graph = Map<string, Set<string>>;

export const PALETTE = [
  "#FFF2CB", "#D7B078", "#E9CD91", "#F4C99D", "#F4E5BD",
  "#DCC68B", "#E9B875", "#DDA982", "#F2DC99", "#D8CCAA",
] as const;

export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function boxesNearWithWrap(a: Box, b: Box, margin: number, width: number): boolean {
  for (const shift of [-width, 0, width]) {
    if (
      a.x <= b.x + shift + b.width + margin &&
      b.x + shift <= a.x + a.width + margin &&
      a.y <= b.y + b.height + margin &&
      b.y <= a.y + a.height + margin
    ) return true;
  }
  return false;
}

/** Square/Chebyshev dilation of a binary mask. X wraps at the map seam; Y does not. */
export function dilatePeriodicX(binary: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (binary.length !== width * height || radius < 0 || radius >= width / 2) {
    throw new Error("Invalid raster dilation dimensions");
  }
  const horizontal = new Uint8Array(binary.length);
  const result = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let count = 0;
    for (let dx = -radius; dx <= radius; dx++) count += binary[row + (dx + width) % width] ? 1 : 0;
    for (let x = 0; x < width; x++) {
      horizontal[row + x] = count ? 255 : 0;
      count -= binary[row + (x - radius + width) % width] ? 1 : 0;
      count += binary[row + (x + radius + 1) % width] ? 1 : 0;
    }
  }
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y <= Math.min(radius, height - 1); y++) count += horizontal[y * width + x] ? 1 : 0;
    for (let y = 0; y < height; y++) {
      result[y * width + x] = count ? 255 : 0;
      if (y - radius >= 0) count -= horizontal[(y - radius) * width + x] ? 1 : 0;
      if (y + radius + 1 < height) count += horizontal[(y + radius + 1) * width + x] ? 1 : 0;
    }
  }
  return result;
}

function oklab(hex: string): [number, number, number] {
  const rgb = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function colorDistance(a: string, b: string): number {
  const x = oklab(a);
  const y = oklab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export function colorGraph(graph: Graph, palette: readonly string[], threshold: number): Map<string, string> {
  const chosen = new Map<string, string>();
  const keys = [...graph.keys()].sort();
  while (chosen.size < keys.length) {
    const uncolored = keys.filter((key) => !chosen.has(key));
    uncolored.sort((a, b) => {
      const saturation = (key: string) => new Set(
        [...(graph.get(key) ?? [])].map((neighbor) => chosen.get(neighbor)).filter(Boolean),
      ).size;
      return saturation(b) - saturation(a) ||
        (graph.get(b)?.size ?? 0) - (graph.get(a)?.size ?? 0) || a.localeCompare(b, "en");
    });
    const key = uncolored[0];
    const neighborColors = [...(graph.get(key) ?? [])]
      .map((neighbor) => chosen.get(neighbor)).filter((value): value is string => Boolean(value));
    const preference = Number.parseInt(shortHash(key).slice(0, 8), 16) % palette.length;
    const ranked = palette.map((color, index) => {
      const distances = neighborColors.map((other) => colorDistance(color, other));
      return {
        color,
        identical: neighborColors.filter((other) => other === color).length,
        close: distances.filter((distance) => distance < threshold).length,
        minimum: distances.length ? Math.min(...distances) : 1,
        mean: distances.length ? distances.reduce((sum, value) => sum + value, 0) / distances.length : 1,
        tie: (index - preference + palette.length) % palette.length,
      };
    }).sort((a, b) => a.identical - b.identical || a.close - b.close ||
      b.minimum - a.minimum || b.mean - a.mean || a.tie - b.tie);
    chosen.set(key, ranked[0].color);
  }
  // Deterministic local repair: never increase the number of exact or perceptually
  // close edges incident to a vertex. This also monotonically improves global counts.
  const repairOrder = [...keys].sort((a, b) =>
    (graph.get(b)?.size ?? 0) - (graph.get(a)?.size ?? 0) || a.localeCompare(b, "en"));
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (const key of repairOrder) {
      const neighbors = [...(graph.get(key) ?? [])].map((other) => chosen.get(other)!);
      const score = (color: string) => ({
        exact: neighbors.filter((other) => other === color).length,
        close: neighbors.filter((other) => colorDistance(color, other) < threshold).length,
      });
      const current = chosen.get(key)!;
      const currentScore = score(current);
      const options = palette.map((color) => ({ color, ...score(color) }))
        .sort((a, b) => a.exact - b.exact || a.close - b.close ||
          colorDistance(b.color, current) - colorDistance(a.color, current) ||
          a.color.localeCompare(b.color, "en"));
      const best = options[0];
      if (best.exact < currentScore.exact ||
        (best.exact === currentScore.exact && best.close < currentScore.close)) {
        chosen.set(key, best.color);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return chosen;
}

export function validateGraph(graph: Graph): void {
  for (const [key, neighbors] of graph) {
    if (neighbors.has(key)) throw new Error(`Self-edge: ${key}`);
    for (const neighbor of neighbors) {
      if (!graph.has(neighbor)) throw new Error(`Missing neighbor: ${neighbor}`);
      if (!graph.get(neighbor)?.has(key)) throw new Error(`Asymmetric edge: ${key} -> ${neighbor}`);
    }
  }
}
