"use client";

import {
  Children,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useRef, useState } from "react";

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
const WHEEL_GESTURE_COOLDOWN_MS = 700;

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
  const activePointerIdRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const wheelLockRef = useRef(false);
  const wheelUnlockTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (wheelUnlockTimeoutRef.current) {
      window.clearTimeout(wheelUnlockTimeoutRef.current);
    }
  }, []);

  const beginDrag = (clientX: number, clientY: number) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    startTimeRef.current = performance.now();
    isHorizontalRef.current = false;
    dragOffsetRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const updateDrag = (clientX: number, clientY: number, preventDefault?: () => void) => {
    if (!isDraggingRef.current) {
      return;
    }

    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;
    const effectiveDeltaX = deltaX;

    if (!isHorizontalRef.current) {
      if (Math.abs(deltaY) > Math.abs(effectiveDeltaX)) {
        setIsDragging(false);
        isDraggingRef.current = false;
        setDragOffset(0);
        dragOffsetRef.current = 0;
        return;
      }

      if (Math.abs(effectiveDeltaX) < 6) {
        return;
      }

      isHorizontalRef.current = true;
      onInteract?.();
    }

    preventDefault?.();

    const isAtStart = currentIndex === 0 && (isRtl ? effectiveDeltaX < 0 : effectiveDeltaX > 0);
    const isAtEnd = currentIndex === totalSlides - 1 && (isRtl ? effectiveDeltaX > 0 : effectiveDeltaX < 0);
    const dampenedDelta = isAtStart || isAtEnd ? effectiveDeltaX * 0.25 : effectiveDeltaX;
    dragOffsetRef.current = dampenedDelta;
    setDragOffset(dampenedDelta);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    beginDrag(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    updateDrag(touch.clientX, touch.clientY, () => event.preventDefault());
  };

  const finishSwipe = () => {
    if (!isDraggingRef.current) {
      setDragOffset(0);
      dragOffsetRef.current = 0;
      return;
    }

    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);
    const finalDragOffset = dragOffsetRef.current;
    const velocity = Math.abs(finalDragOffset) / elapsed;

    const shouldNavigate =
      Math.abs(finalDragOffset) > SWIPE_DISTANCE_THRESHOLD ||
      velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldNavigate && totalSlides > 1) {
      const direction = isRtl ? (finalDragOffset > 0 ? 1 : -1) : (finalDragOffset < 0 ? 1 : -1);
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), totalSlides - 1);

      if (nextIndex !== currentIndex) {
        onIndexChange(nextIndex);
      }
    }

    setIsDragging(false);
    isDraggingRef.current = false;
    setDragOffset(0);
    dragOffsetRef.current = 0;
    activePointerIdRef.current = null;
  };

  const scheduleWheelUnlock = () => {
    if (wheelUnlockTimeoutRef.current) {
      window.clearTimeout(wheelUnlockTimeoutRef.current);
    }

    wheelUnlockTimeoutRef.current = window.setTimeout(() => {
      wheelLockRef.current = false;
      wheelUnlockTimeoutRef.current = null;
    }, WHEEL_GESTURE_COOLDOWN_MS);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    beginDrag(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    updateDrag(event.clientX, event.clientY, () => event.preventDefault());
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishSwipe();
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (totalSlides <= 1) {
      return;
    }

    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
    const shiftedDelta = event.shiftKey && Math.abs(event.deltaY) > 12 ? event.deltaY : 0;
    const effectiveDelta = horizontalDelta || shiftedDelta;

    if (Math.abs(effectiveDelta) < 24) {
      return;
    }

    event.preventDefault();

    if (wheelLockRef.current) {
      scheduleWheelUnlock();
      return;
    }

    onInteract?.();

    const direction = isRtl ? (effectiveDelta < 0 ? 1 : -1) : (effectiveDelta > 0 ? 1 : -1);
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), totalSlides - 1);

    if (nextIndex !== currentIndex) {
      onIndexChange(nextIndex);
    }

    wheelLockRef.current = true;
    scheduleWheelUnlock();
  };

  return (
    <div
      className="mobile-slideshow-swipe-layer"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishSwipe}
      onTouchCancel={finishSwipe}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onWheel={handleWheel}
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
