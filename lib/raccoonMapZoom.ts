export type RaccoonMapType =
  | "country"
  | "river"
  | "sea"
  | "physic"
  | "flag"
  | "animal"
  | "culture"
  | "weather"
  | "food";

const MOBILE_MAX_ZOOM: Record<RaccoonMapType, number> = {
  country: 16,
  river: 12,
  sea: 16,
  physic: 12,
  flag: 16,
  animal: 12,
  culture: 16,
  weather: 12,
  food: 16,
};

export function getMobileMaxZoom(type: RaccoonMapType): number {
  return MOBILE_MAX_ZOOM[type];
}

export function clampMobileZoom(
  rawZoom: number,
  minZoom: number,
  maxZoom: number,
): number {
  if (!Number.isFinite(rawZoom)) {
    return minZoom;
  }

  return Math.min(maxZoom, Math.max(minZoom, rawZoom));
}

export function getMobilePanBounds(params: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  zoom: number;
}) {
  const { viewportWidth, viewportHeight, contentWidth, contentHeight, zoom } =
    params;
  const scaledWidth = contentWidth * zoom;
  const scaledHeight = contentHeight * zoom;

  let minX = viewportWidth - scaledWidth;
  let maxX = 0;
  let minY = viewportHeight - scaledHeight;
  let maxY = 0;

  if (minX > maxX) {
    minX = (minX + maxX) / 2;
    maxX = minX;
  }

  if (minY > maxY) {
    minY = (minY + maxY) / 2;
    maxY = minY;
  }

  return { minX, maxX, minY, maxY };
}

export function clampMobilePanPosition(
  x: number,
  y: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
) {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}
