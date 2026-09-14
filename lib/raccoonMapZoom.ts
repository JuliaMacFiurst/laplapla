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
  physic: 128,
  flag: 16,
  animal: 192,
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

/** Allow the first and last map pixels to reach the viewport center at deep zoom. */
export function getMobilePhysicPanBounds(params: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  zoom: number;
}) {
  const bounds = getMobilePanBounds(params);
  const horizontalInset = Math.min(
    params.viewportWidth / 2,
    Math.max(0, (params.contentWidth * params.zoom - params.viewportWidth) / 2),
  );
  const verticalInset = Math.min(
    params.viewportHeight / 2,
    Math.max(0, (params.contentHeight * params.zoom - params.viewportHeight) / 2),
  );
  return {
    minX: bounds.minX - horizontalInset,
    maxX: bounds.maxX + horizontalInset,
    minY: bounds.minY - verticalInset,
    maxY: bounds.maxY + verticalInset,
  };
}

export function getMobilePhysicPositionAfterZoom(
  position: { x: number; y: number },
  oldZoom: number,
  newZoom: number,
  anchor: { x: number; y: number },
) {
  const ratio = newZoom / oldZoom;
  return {
    x: anchor.x - (anchor.x - position.x) * ratio,
    y: anchor.y - (anchor.y - position.y) * ratio,
  };
}

export function getMobilePhysicDoubleTapZoom(
  currentZoom: number,
  minZoom: number,
  maxZoom: number,
): number {
  return currentZoom >= maxZoom - 1e-9
    ? minZoom
    : Math.min(maxZoom, currentZoom * 1.6);
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
