export type DesktopPhysicMapGeometry = {
  viewportWidth: number;
  viewportHeight: number;
  svgLeft: number;
  svgTop: number;
  svgWidth: number;
  svgHeight: number;
};

type Position = { x: number; y: number };

/** Keep at least 20% of each viewport axis occupied by the rendered SVG. */
export function clampDesktopPhysicMapPosition(
  position: Position,
  zoom: number,
  geometry: DesktopPhysicMapGeometry,
): Position {
  const visibleWidth = Math.min(geometry.viewportWidth * 0.2, geometry.svgWidth * zoom * 0.5);
  const visibleHeight = Math.min(geometry.viewportHeight * 0.2, geometry.svgHeight * zoom * 0.5);
  const minX = visibleWidth - (geometry.svgLeft + geometry.svgWidth) * zoom;
  const maxX = geometry.viewportWidth - visibleWidth - geometry.svgLeft * zoom;
  const minY = visibleHeight - (geometry.svgTop + geometry.svgHeight) * zoom;
  const maxY = geometry.viewportHeight - visibleHeight - geometry.svgTop * zoom;

  return {
    x: Math.min(maxX, Math.max(minX, position.x)),
    y: Math.min(maxY, Math.max(minY, position.y)),
  };
}

export function getDesktopPhysicPositionAfterZoomOut(
  position: Position,
  oldZoom: number,
  newZoom: number,
  geometry: DesktopPhysicMapGeometry,
  minZoom = 1,
): Position {
  const ratio = newZoom / oldZoom;
  const centeredOnViewport = {
    x: geometry.viewportWidth / 2 - (geometry.viewportWidth / 2 - position.x) * ratio,
    y: geometry.viewportHeight / 2 - (geometry.viewportHeight / 2 - position.y) * ratio,
  };
  const nextPosition = newZoom <= minZoom + 1e-9
    ? {
        x: (geometry.viewportWidth - geometry.svgWidth * newZoom) / 2 - geometry.svgLeft * newZoom,
        y: (geometry.viewportHeight - geometry.svgHeight * newZoom) / 2 - geometry.svgTop * newZoom,
      }
    : centeredOnViewport;

  return clampDesktopPhysicMapPosition(nextPosition, newZoom, geometry);
}
