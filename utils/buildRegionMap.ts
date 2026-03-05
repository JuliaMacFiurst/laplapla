

/**
 * buildRegionMap.ts
 *
 * Core of the browser color engine:
 * 1) Detect "line" pixels (boundaries).
 * 2) Optional: thicken lines a bit to close tiny gaps (prevents color leaks).
 * 3) Flood-fill all non-line pixels into regions (each region gets an id).
 *
 * Output:
 * - regionMap: Int32Array of length width*height
 *   - -1 for line pixels
 *   -  0..(regionCount-1) for fillable regions
 * - lineMask: Uint8Array (1 = line, 0 = not-line)
 *
 * Notes:
 * - This is intentionally deterministic and fast (no ML).
 * - For best results, line-art should have sufficiently dark strokes.
 */

export type BuildRegionMapOptions = {
  /**
   * Luminance threshold for considering a pixel part of a line.
   * Lower => stricter (fewer pixels are considered line).
   */
  lineThreshold?: number; // default 170

  /**
   * Treat near-transparent pixels as empty (not a line).
   */
  alphaThreshold?: number; // default 8

  /**
   * Expand detected lines by N pixels (simple dilation).
   * This helps close small gaps and prevents spill between regions.
   * 0 = no expansion.
   */
  lineGrowRadius?: number; // default 1

  /**
   * Skip (merge into "background") tiny regions of size <= this.
   * Set 0 to keep everything. Default keeps everything.
   */
  minRegionSize?: number; // default 0

  /**
   * If true, returns also a regionSizes array.
   */
  returnRegionSizes?: boolean; // default false
};

export type BuildRegionMapResult = {
  width: number;
  height: number;
  regionMap: Int32Array;
  lineMask: Uint8Array;
  regionCount: number;
  /** Optional sizes for each regionId (same order as ids). */
  regionSizes?: Uint32Array;
};

/**
 * Convert RGB to luminance (perceived brightness).
 */
function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Create a binary mask of line pixels from ImageData.
 */
function detectLineMask(
  imageData: ImageData,
  lineThreshold: number,
  alphaThreshold: number
): Uint8Array {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);

  // data is RGBA, 0..255
  for (let i = 0, p = 0; p < mask.length; p++, i += 4) {
    const a = data[i + 3];
    if (a <= alphaThreshold) {
      mask[p] = 0;
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = luminance(r, g, b);

    // "Line" = dark-ish pixel
    mask[p] = y < lineThreshold ? 1 : 0;
  }

  return mask;
}

/**
 * Expand line pixels by radius (simple dilation).
 * We intentionally only dilate (not close+open) because thicker boundaries
 * are better for preventing leaks in kids' coloring.
 */
function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  if (radius <= 0) return mask;

  const out = new Uint8Array(mask.length);
  out.set(mask);

  // For each line pixel, mark its neighborhood.
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const idx = row + x;
      if (mask[idx] === 0) continue;

      const y0 = Math.max(0, y - radius);
      const y1 = Math.min(height - 1, y + radius);
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);

      for (let yy = y0; yy <= y1; yy++) {
        let rr = yy * width;
        for (let xx = x0; xx <= x1; xx++) {
          out[rr + xx] = 1;
        }
      }
    }
  }

  return out;
}

/**
 * Flood fill non-line pixels into region ids.
 * Uses 4-neighborhood connectivity for stability.
 */
function floodFillRegions(
  lineMask: Uint8Array,
  width: number,
  height: number,
  minRegionSize: number,
  returnSizes: boolean
): { regionMap: Int32Array; regionCount: number; regionSizes?: Uint32Array } {
  const n = width * height;

  // -2 = unvisited, -1 = line, >=0 = regionId
  const regionMap = new Int32Array(n);
  regionMap.fill(-2);

  for (let i = 0; i < n; i++) {
    if (lineMask[i] === 1) regionMap[i] = -1;
  }

  // Preallocate a queue big enough for worst case.
  // We use two Int32Arrays for x/y to avoid object allocations.
  const qx = new Int32Array(n);
  const qy = new Int32Array(n);

  const sizes: number[] = [];
  let regionId = 0;

  for (let start = 0; start < n; start++) {
    if (regionMap[start] !== -2) continue; // already visited or line

    const sx = start % width;
    const sy = (start / width) | 0;

    // BFS
    let head = 0;
    let tail = 0;
    qx[tail] = sx;
    qy[tail] = sy;
    tail++;

    regionMap[start] = regionId;

    let size = 0;

    while (head < tail) {
      const x = qx[head];
      const y = qy[head];
      head++;
      size++;

      // 4-connected neighbors
      // left
      if (x > 0) {
        const ni = y * width + (x - 1);
        if (regionMap[ni] === -2) {
          regionMap[ni] = regionId;
          qx[tail] = x - 1;
          qy[tail] = y;
          tail++;
        }
      }
      // right
      if (x < width - 1) {
        const ni = y * width + (x + 1);
        if (regionMap[ni] === -2) {
          regionMap[ni] = regionId;
          qx[tail] = x + 1;
          qy[tail] = y;
          tail++;
        }
      }
      // up
      if (y > 0) {
        const ni = (y - 1) * width + x;
        if (regionMap[ni] === -2) {
          regionMap[ni] = regionId;
          qx[tail] = x;
          qy[tail] = y - 1;
          tail++;
        }
      }
      // down
      if (y < height - 1) {
        const ni = (y + 1) * width + x;
        if (regionMap[ni] === -2) {
          regionMap[ni] = regionId;
          qx[tail] = x;
          qy[tail] = y + 1;
          tail++;
        }
      }
    }

    // Optionally discard tiny regions (turn them into "background" = -3)
    // We'll normalize these later by remapping if needed.
    if (minRegionSize > 0 && size <= minRegionSize) {
      for (let i = 0; i < tail; i++) {
        const x = qx[i];
        const y = qy[i];
        regionMap[y * width + x] = -3; // tiny region
      }
    } else {
      sizes[regionId] = size;
      regionId++;
    }
  }

  // If we used -3 for tiny regions, we keep them as -3 (caller may treat as unfillable).
  // regionCount is regionId (only kept regions).
  if (returnSizes) {
    const outSizes = new Uint32Array(regionId);
    for (let i = 0; i < regionId; i++) outSizes[i] = sizes[i] ?? 0;
    return { regionMap, regionCount: regionId, regionSizes: outSizes };
  }

  return { regionMap, regionCount: regionId };
}

/**
 * Main entry.
 */
export function buildRegionMap(
  imageData: ImageData,
  options: BuildRegionMapOptions = {}
): BuildRegionMapResult {
  const width = imageData.width;
  const height = imageData.height;

  const lineThreshold = options.lineThreshold ?? 170;
  const alphaThreshold = options.alphaThreshold ?? 8;
  const lineGrowRadius = options.lineGrowRadius ?? 1;
  const minRegionSize = options.minRegionSize ?? 0;
  const returnRegionSizes = options.returnRegionSizes ?? false;

  // 1) detect boundaries
  let lineMask = detectLineMask(imageData, lineThreshold, alphaThreshold);

  // 2) thicken boundaries slightly (prevents leaks)
  lineMask = dilateMask(lineMask, width, height, lineGrowRadius);

  // 3) build regions
  const { regionMap, regionCount, regionSizes } = floodFillRegions(
    lineMask,
    width,
    height,
    minRegionSize,
    returnRegionSizes
  );

  const result: BuildRegionMapResult = {
    width,
    height,
    regionMap,
    lineMask,
    regionCount,
  };

  if (returnRegionSizes && regionSizes) result.regionSizes = regionSizes;

  return result;
}