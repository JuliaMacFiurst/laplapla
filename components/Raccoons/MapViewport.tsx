import Image from "next/image";
import { memo, type MutableRefObject, type ReactNode } from "react";

type MapSvgHostProps = {
  svgContent: string | null;
  svgHostRef: MutableRefObject<HTMLDivElement | null>;
};

const MapSvgHost = memo(function MapSvgHost({
  svgContent,
  svgHostRef,
}: MapSvgHostProps) {
  return (
    <div
      ref={svgHostRef}
      className="map-svg-host"
      // Map SVGs are sanitized at the trusted /api/map-svg boundary.
      dangerouslySetInnerHTML={{ __html: svgContent || "" }}
    />
  );
});

type MapViewportProps = {
  svgContent: string | null;
  isVisible: boolean;
  isMapLoading: boolean;
  mapContentRef: MutableRefObject<HTMLDivElement | null>;
  svgHostRef: MutableRefObject<HTMLDivElement | null>;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: () => void;
  onTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  controls?: ReactNode;
};

export default function MapViewport({
  svgContent,
  isVisible,
  isMapLoading,
  mapContentRef,
  svgHostRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onDoubleClick,
  controls,
}: MapViewportProps) {
  return (
    <div className="map-container" data-testid="raccoons-map-viewport">
      <div
        ref={mapContentRef}
        className={`map-content transition-opacity duration-700 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={onDoubleClick}
      >
        <MapSvgHost svgContent={svgContent} svgHostRef={svgHostRef} />
      </div>

      {isMapLoading ? (
        <div className="map-loading-overlay" role="status" aria-live="polite">
          <Image
            src="/spinners/CatSpinner.svg"
            alt=""
            width={64}
            height={64}
            aria-hidden="true"
            unoptimized
          />
        </div>
      ) : null}

      {controls}
    </div>
  );
}
