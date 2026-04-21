import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { getMapSvg } from "@/utils/storageMaps";

const DEFAULT_VIEW_BOX = { width: 2000, height: 856 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;
const TAP_MOVE_THRESHOLD = 8;

export type MobileSvgMapPoint = {
  x: number;
  y: number;
};

export type MobileSvgMapHit = {
  id: string;
  tagName: string;
  classNames: string[];
};

export type MobileSvgMapPointerEvent = {
  point: MobileSvgMapPoint;
  hit: MobileSvgMapHit | null;
  originalEvent: PointerEvent<HTMLDivElement>;
};

type MobileSvgDrawMapProps = {
  mapPath: string;
  loadingLabel: string;
  emptyLabel?: string;
  routePoints?: MobileSvgMapPoint[];
  routePathD?: string;
  routeColor?: string;
  routeStrokeWidth?: number;
  startPoint?: MobileSvgMapPoint | null;
  targetPoint?: MobileSvgMapPoint | null;
  targetLabel?: string;
  enablePanZoom?: boolean;
  ignoredHitIds?: Set<string>;
  onPointerDown?: (event: MobileSvgMapPointerEvent) => void;
  onPointerMove?: (event: MobileSvgMapPointerEvent) => void;
  onPointerUp?: (event: MobileSvgMapPointerEvent) => void;
  onRouteHitIdsChange?: (ids: string[]) => void;
};

function parseViewBox(svgContent: string) {
  const match = svgContent.match(/viewBox=["']([^"']+)["']/i);
  if (!match) return DEFAULT_VIEW_BOX;

  const values = match[1]
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number(value));

  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return DEFAULT_VIEW_BOX;
  }

  const [, , width, height] = values;
  if (width <= 0 || height <= 0) return DEFAULT_VIEW_BOX;

  return { width, height };
}

function toPolylinePath(points: MobileSvgMapPoint[], width: number, height: number) {
  if (!points.length) return "";

  const [first, ...rest] = points;
  return [
    `M ${first.x * width} ${first.y * height}`,
    ...rest.map((point) => `L ${point.x * width} ${point.y * height}`),
  ].join(" ");
}

function getElementHit(element: Element | null, ignoredHitIds?: Set<string>): MobileSvgMapHit | null {
  const hit = element?.closest("[id]") as HTMLElement | SVGElement | null;
  if (!hit?.id || ignoredHitIds?.has(hit.id)) return null;

  return {
    id: hit.id,
    tagName: hit.tagName.toLowerCase(),
    classNames: Array.from(hit.classList),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MobileSvgDrawMap({
  mapPath,
  loadingLabel,
  emptyLabel = "",
  routePoints = [],
  routePathD = "",
  routeColor = "#2563eb",
  routeStrokeWidth = 14,
  startPoint = null,
  targetPoint = null,
  targetLabel = "",
  enablePanZoom = false,
  ignoredHitIds,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onRouteHitIdsChange,
}: MobileSvgDrawMapProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const routePathRef = useRef<SVGPathElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const [svgContent, setSvgContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const viewBox = useMemo(() => parseViewBox(svgContent), [svgContent]);
  const hasRoute = Boolean(routePathD) || routePoints.length > 1;
  const transformStyle = enablePanZoom
    ? { transform: `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})` }
    : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSvgContent("");

    void getMapSvg(mapPath).then((nextSvg) => {
      if (cancelled) return;
      setSvgContent(nextSvg || "");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mapPath]);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container || !svgContent) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.display = "block";
  }, [svgContent]);

  const clampPan = (nextPan: { x: number; y: number }, nextZoom = zoom) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || nextZoom <= 1) return { x: 0, y: 0 };

    return {
      x: clamp(nextPan.x, rect.width * (1 - nextZoom), 0),
      y: clamp(nextPan.y, rect.height * (1 - nextZoom), 0),
    };
  };

  const setZoomLevel = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clampedZoom);
    setPan((current) => clampPan(current, clampedZoom));
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const contentX = enablePanZoom ? (localX - pan.x) / zoom : localX;
    const contentY = enablePanZoom ? (localY - pan.y) / zoom : localY;

    return {
      x: Math.min(1, Math.max(0, contentX / rect.width)),
      y: Math.min(1, Math.max(0, contentY / rect.height)),
    };
  };

  const getHit = (event: PointerEvent<HTMLDivElement>) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    return getElementHit(element, ignoredHitIds);
  };

  const buildPointerEvent = (event: PointerEvent<HTMLDivElement>): MobileSvgMapPointerEvent => ({
    point: getPoint(event),
    hit: getHit(event),
    originalEvent: event,
  });

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enablePanZoom) {
      onPointerDown?.(buildPointerEvent(event));
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enablePanZoom) {
      onPointerMove?.(buildPointerEvent(event));
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const distance = Math.hypot(dx, dy);
    if (distance > TAP_MOVE_THRESHOLD) drag.moved = true;

    if (zoom > 1 && drag.moved) {
      setPan(clampPan({ x: drag.panX + dx, y: drag.panY + dy }));
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!enablePanZoom) {
      onPointerUp?.(buildPointerEvent(event));
      return;
    }

    const drag = dragRef.current;
    dragRef.current = null;

    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      onPointerDown?.(buildPointerEvent(event));
    }
  };

  useEffect(() => {
    if (!onRouteHitIdsChange) return;

    const routePath = routePathRef.current;
    if (!routePath || !hasRoute) {
      onRouteHitIdsChange([]);
      return;
    }

    const routeSvg = routePath.ownerSVGElement;
    if (!routeSvg) {
      onRouteHitIdsChange([]);
      return;
    }

    const matrix = routeSvg.getScreenCTM();
    if (!matrix) {
      onRouteHitIdsChange([]);
      return;
    }

    const ids = new Set<string>();
    const length = routePath.getTotalLength();
    const step = Math.max(10, length / 72);

    for (let offset = 0; offset <= length; offset += step) {
      const routePoint = routePath.getPointAtLength(offset);
      const svgPoint = routeSvg.createSVGPoint();
      svgPoint.x = routePoint.x;
      svgPoint.y = routePoint.y;

      const screenPoint = svgPoint.matrixTransform(matrix);
      const element = document.elementFromPoint(screenPoint.x, screenPoint.y);
      const hit = getElementHit(element, ignoredHitIds);
      if (hit?.id) ids.add(hit.id);
    }

    onRouteHitIdsChange([...ids]);
  }, [hasRoute, ignoredHitIds, onRouteHitIdsChange, routePathD, routePoints, svgContent]);

  return (
    <div
      ref={surfaceRef}
      className="quest-mobile-svg-map"
      style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="quest-mobile-svg-map-content" style={transformStyle}>
        {loading ? (
          <div className="quest-mobile-svg-map-state">{loadingLabel}</div>
        ) : svgContent ? (
          <div
            ref={svgContainerRef}
            className="quest-mobile-svg-map-base"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="quest-mobile-svg-map-state quest-mobile-svg-map-empty">{emptyLabel}</div>
        )}

        <svg
          className="quest-mobile-svg-map-route"
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="none"
        >
          {routePathD ? (
            <path ref={routePathRef} d={routePathD} style={{ stroke: routeColor, strokeWidth: routeStrokeWidth }} />
          ) : routePoints.length > 1 ? (
            <path
              ref={routePathRef}
              d={toPolylinePath(routePoints, viewBox.width, viewBox.height)}
              style={{ stroke: routeColor, strokeWidth: routeStrokeWidth }}
            />
          ) : (
            <path ref={routePathRef} d="" />
          )}
        </svg>

        {startPoint ? (
          <span
            className="quest-mobile-svg-map-pin quest-mobile-svg-map-pin-start"
            style={{ left: `${startPoint.x * 100}%`, top: `${startPoint.y * 100}%` }}
          />
        ) : null}

        {targetPoint ? (
          <>
            <span
              className="quest-mobile-svg-map-pin quest-mobile-svg-map-pin-target"
              style={{ left: `${targetPoint.x * 100}%`, top: `${targetPoint.y * 100}%` }}
            />
            {targetLabel ? (
              <span
                className="quest-mobile-svg-map-target-label"
                style={{ left: `${targetPoint.x * 100}%`, top: `${targetPoint.y * 100}%` }}
              >
                {targetLabel}
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {enablePanZoom ? (
        <div className="quest-mobile-svg-map-zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setZoomLevel(zoom + 0.4)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => setZoomLevel(zoom - 0.4)} aria-label="Zoom out">
            -
          </button>
          <button type="button" onClick={resetZoom} aria-label="Reset zoom">
            1x
          </button>
        </div>
      ) : null}
    </div>
  );
}
