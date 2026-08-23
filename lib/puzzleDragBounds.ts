export type PuzzleDragPiece = {
  x: number;
  y: number;
  canvas: { width: number; height: number };
};

export type PuzzleDragDelta = { dx: number; dy: number };

export function getPuzzleGroupBounds(pieces: PuzzleDragPiece[]) {
  return pieces.reduce(
    (bounds, piece) => ({
      minX: Math.min(bounds.minX, piece.x),
      minY: Math.min(bounds.minY, piece.y),
      maxX: Math.max(bounds.maxX, piece.x + piece.canvas.width),
      maxY: Math.max(bounds.maxY, piece.y + piece.canvas.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

export function clampPuzzleGroupDelta(
  pieces: PuzzleDragPiece[],
  requested: PuzzleDragDelta,
  board: { width: number; height: number },
  minimumVisible: { x: number; y: number },
): PuzzleDragDelta {
  if (!pieces.length) return { dx: 0, dy: 0 };
  const bounds = getPuzzleGroupBounds(pieces);
  const minDx = minimumVisible.x - bounds.maxX;
  const maxDx = board.width - minimumVisible.x - bounds.minX;
  const minDy = minimumVisible.y - bounds.maxY;
  const maxDy = board.height - minimumVisible.y - bounds.minY;

  return {
    dx: Math.min(maxDx, Math.max(minDx, requested.dx)),
    dy: Math.min(maxDy, Math.max(minDy, requested.dy)),
  };
}

export function getPuzzleMinimumVisible(
  boardLogical: { width: number; height: number },
  boardRendered: { width: number; height: number },
  cssPixels = 28,
) {
  const renderedWidth = Number.isFinite(boardRendered.width) && boardRendered.width > 0
    ? boardRendered.width
    : boardLogical.width;
  const renderedHeight = Number.isFinite(boardRendered.height) && boardRendered.height > 0
    ? boardRendered.height
    : boardLogical.height;
  return {
    x: cssPixels * boardLogical.width / renderedWidth,
    y: cssPixels * boardLogical.height / renderedHeight,
  };
}
