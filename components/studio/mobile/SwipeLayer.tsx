"use client";

import { Children, type ReactNode } from "react";
import { useRef, useState } from "react";

interface SwipeLayerProps {
  children: ReactNode;
  currentIndex: number;
  totalSlides: number;
  isRtl?: boolean;
  onIndexChange: (nextIndex: number) => void;
  onInteract?: () => void;
}

const SWIPE_DISTANCE_THRESHOLD = 56;
const SWIPE_VELOCITY_THRESHOLD = 0.35;

export default function SwipeLayer({
  children,
  currentIndex,
  totalSlides,
  isRtl = false,
  onIndexChange,
  onInteract,
}: SwipeLayerProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const slideNodes = Children.toArray(children);
  const renderedChildren = isRtl ? [...slideNodes].reverse() : slideNodes;
  const visualIndex = isRtl ? Math.max(0, totalSlides - 1 - currentIndex) : currentIndex;

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isHorizontalRef = useRef(false);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = performance.now();
    isHorizontalRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;
    const effectiveDeltaX = deltaX;

    if (!isHorizontalRef.current) {
      if (Math.abs(deltaY) > Math.abs(effectiveDeltaX)) {
        setIsDragging(false);
        setDragOffset(0);
        return;
      }

      if (Math.abs(effectiveDeltaX) < 6) {
        return;
      }

      isHorizontalRef.current = true;
      onInteract?.();
    }

    event.preventDefault();

    const isAtStart = currentIndex === 0 && (isRtl ? effectiveDeltaX < 0 : effectiveDeltaX > 0);
    const isAtEnd = currentIndex === totalSlides - 1 && (isRtl ? effectiveDeltaX > 0 : effectiveDeltaX < 0);
    const dampenedDelta = isAtStart || isAtEnd ? effectiveDeltaX * 0.25 : effectiveDeltaX;
    setDragOffset(dampenedDelta);
  };

  const finishSwipe = () => {
    if (!isDragging) {
      setDragOffset(0);
      return;
    }

    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);
    const velocity = Math.abs(dragOffset) / elapsed;

    const shouldNavigate =
      Math.abs(dragOffset) > SWIPE_DISTANCE_THRESHOLD ||
      velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldNavigate && totalSlides > 1) {
      const direction = isRtl ? (dragOffset > 0 ? 1 : -1) : (dragOffset < 0 ? 1 : -1);
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), totalSlides - 1);

      if (nextIndex !== currentIndex) {
        onIndexChange(nextIndex);
      }
    }

    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div
      className="mobile-slideshow-swipe-layer"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishSwipe}
      onTouchCancel={finishSwipe}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "pan-y",
        direction: "ltr",
      }}
    >
      <div
        className="mobile-slideshow-track"
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          transform: `translateX(calc(${-visualIndex * 100}% + ${dragOffset}px))`,
          transition: isDragging ? "none" : "transform 300ms ease-out",
          direction: "ltr",
        }}
      >
        {renderedChildren}
      </div>
    </div>
  );
}
