export type CanvasViewport = { scale: number; x: number; y: number };
export type Point = { x: number; y: number };

export const DOG_LESSON_MIN_SCALE = 1;
export const DOG_LESSON_MAX_SCALE = 3.5;
export const DOG_LESSON_VISIBLE_FRACTION = 0.25;

export function clampViewportScale(value: number) {
  if (!Number.isFinite(value)) return DOG_LESSON_MIN_SCALE;
  return Math.min(DOG_LESSON_MAX_SCALE, Math.max(DOG_LESSON_MIN_SCALE, value));
}

export function clampCanvasViewport(
  view: CanvasViewport,
  viewport: { width: number; height: number },
  stage: { width: number; height: number },
): CanvasViewport {
  const scale = clampViewportScale(view.scale);
  if (scale === DOG_LESSON_MIN_SCALE) return { scale, x: 0, y: 0 };

  const visibleWidth = Math.min(stage.width, viewport.width) * DOG_LESSON_VISIBLE_FRACTION;
  const visibleHeight = Math.min(stage.height, viewport.height) * DOG_LESSON_VISIBLE_FRACTION;
  const minX = visibleWidth - stage.width * scale;
  const maxX = viewport.width - visibleWidth;
  const minY = visibleHeight - stage.height * scale;
  const maxY = viewport.height - visibleHeight;

  return {
    scale,
    x: Math.min(maxX, Math.max(minX, Number.isFinite(view.x) ? view.x : 0)),
    y: Math.min(maxY, Math.max(minY, Number.isFinite(view.y) ? view.y : 0)),
  };
}

export function updateViewportFromPinch(params: {
  initial: CanvasViewport;
  initialDistance: number;
  initialCenter: Point;
  distance: number;
  center: Point;
  viewport: { width: number; height: number };
  stage: { width: number; height: number };
}) {
  const { initial, initialDistance, initialCenter, distance, center, viewport, stage } = params;
  if (!Number.isFinite(initialDistance) || initialDistance <= 0) {
    return clampCanvasViewport(initial, viewport, stage);
  }

  const scale = clampViewportScale(initial.scale * (distance / initialDistance));
  const contentX = (initialCenter.x - initial.x) / initial.scale;
  const contentY = (initialCenter.y - initial.y) / initial.scale;

  return clampCanvasViewport(
    {
      scale,
      x: center.x - contentX * scale,
      y: center.y - contentY * scale,
    },
    viewport,
    stage,
  );
}

export function mapClientPointToCanvas(
  client: Point,
  rect: { left: number; top: number; width: number; height: number },
  canvas: { width: number; height: number },
) {
  return {
    x: (client.x - rect.left) * (canvas.width / rect.width),
    y: (client.y - rect.top) * (canvas.height / rect.height),
  };
}
