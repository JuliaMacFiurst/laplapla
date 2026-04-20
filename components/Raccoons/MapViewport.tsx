import type { MutableRefObject, ReactNode } from "react";

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
    <div className="map-container">
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
        <div
          ref={svgHostRef}
          className="map-svg-host"
          dangerouslySetInnerHTML={{ __html: svgContent || "" }}
        />
      </div>

      {isMapLoading ? (
        <div className="map-loading-overlay" role="status" aria-live="polite">
          <img
            src="/spinners/CatSpinner.svg"
            alt=""
            width={64}
            height={64}
            aria-hidden="true"
          />
        </div>
      ) : null}

      {controls}
    </div>
  );
}
