/** The biomes SVG supplies intrinsic dimensions but no viewBox. */
export function getMissingAnimalViewBox(
  viewBox: string | null,
  width: string | null,
  height: string | null,
): string | null {
  if (viewBox?.trim()) return null;
  const parseDimension = (value: string | null) => {
    const match = value?.match(/^\s*(\d+(?:\.\d+)?)(?:px)?\s*$/);
    return match ? Number(match[1]) : 0;
  };
  const parsedWidth = parseDimension(width);
  const parsedHeight = parseDimension(height);
  return parsedWidth > 0 && parsedHeight > 0
    ? `0 0 ${parsedWidth} ${parsedHeight}`
    : null;
}

export function getAnimalMobileSafeView(params: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
}) {
  const { viewportWidth, viewportHeight, contentWidth, contentHeight } = params;
  const zoom = Math.min(1, viewportWidth / contentWidth, viewportHeight / contentHeight);
  return {
    zoom,
    x: (viewportWidth - contentWidth * zoom) / 2,
    y: (viewportHeight - contentHeight * zoom) / 2,
  };
}

export function getAnimalMobileResetPosition(
  safeView: { x: number; y: number; zoom: number },
  nextZoom: number,
): { x: number; y: number } | null {
  return nextZoom <= safeView.zoom + 1e-9
    ? { x: safeView.x, y: safeView.y }
    : null;
}

export function getAnimalMobilePositionAfterZoom(
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

export function getAnimalMobileDoubleTapZoom(
  currentZoom: number,
  minZoom: number,
  maxZoom: number,
) {
  return currentZoom >= maxZoom - 1e-9
    ? minZoom
    : Math.min(maxZoom, currentZoom * 1.6);
}

/** Bounds follow the fitted world inside the SVG, excluding its portrait letterbox. */
export function getAnimalMobilePanBounds(params: {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  zoom: number;
}) {
  const { viewportWidth, viewportHeight, contentWidth, contentHeight,
    viewBoxWidth, viewBoxHeight, zoom } = params;
  const scale = Math.min(contentWidth / viewBoxWidth, contentHeight / viewBoxHeight);
  const mapWidth = viewBoxWidth * scale;
  const mapHeight = viewBoxHeight * scale;
  const left = (contentWidth - mapWidth) / 2;
  const top = (contentHeight - mapHeight) / 2;

  const axisBounds = (viewport: number, start: number, size: number) => {
    let min = viewport - (start + size) * zoom;
    let max = -start * zoom;
    if (min > max) min = max = (min + max) / 2;
    const centerMargin = Math.min(
      viewport / 2, Math.max(0, (size * zoom - viewport) / 2),
    );
    return { min: min - centerMargin, max: max + centerMargin };
  };
  const x = axisBounds(viewportWidth, left, mapWidth);
  const y = axisBounds(viewportHeight, top, mapHeight);
  return { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max };
}
