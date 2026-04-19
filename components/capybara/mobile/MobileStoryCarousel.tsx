import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { fallbackImages } from "@/constants";
import { dictionaries, type Lang } from "@/i18n";
import type { CarouselStory } from "@/types/types";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

interface MobileStoryCarouselProps {
  story: CarouselStory;
  lang: Lang;
  t?: CapybaraPageDict;
  initialSlideIndex?: number;
  onSlideIndexChange?: (slideIndex: number) => void;
  onSwipeStateChange?: (isSwiping: boolean) => void;
  isFindingNewImage?: boolean;
  emptyMessage?: string;
  mediaCache?: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide?: (slideIndex: number) => void;
  showEmptyError?: boolean;
}

const SWIPE_DISTANCE_THRESHOLD = 28;
const SWIPE_VELOCITY_THRESHOLD = 0.18;
const SWIPE_LOCK_THRESHOLD = 6;
const VERTICAL_CANCEL_THRESHOLD = 12;
const HORIZONTAL_CONFIRM_THRESHOLD = 14;

export default function MobileStoryCarousel({
  story,
  lang,
  t,
  initialSlideIndex = 0,
  onSlideIndexChange,
  onSwipeStateChange,
  emptyMessage,
  mediaCache,
  onPreloadNextSlide,
  showEmptyError,
}: MobileStoryCarouselProps) {
  const dict = t ?? dictionaries[lang]?.capybaras?.capybaraPage ?? dictionaries.ru.capybaras.capybaraPage;
  const slideCount = story.slides.length;
  const clampSlideIndex = (value: number) => {
    if (slideCount <= 0) {
      return 0;
    }

    return Math.min(Math.max(value, 0), slideCount - 1);
  };

  const [slideIndex, setSlideIndex] = useState(() => clampSlideIndex(initialSlideIndex));
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const gestureAxisRef = useRef<"pending" | "horizontal" | "vertical">("pending");
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const activeTouchIdRef = useRef<number | null>(null);
  const slideIndexRef = useRef(clampSlideIndex(initialSlideIndex));
  const onSlideIndexChangeRef = useRef(onSlideIndexChange);
  const onSwipeStateChangeRef = useRef(onSwipeStateChange);
  const removeWindowListenersRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    onSlideIndexChangeRef.current = onSlideIndexChange;
  }, [onSlideIndexChange]);

  useEffect(() => {
    onSwipeStateChangeRef.current = onSwipeStateChange;
  }, [onSwipeStateChange]);

  useEffect(() => {
    const nextIndex = clampSlideIndex(initialSlideIndex);
    slideIndexRef.current = nextIndex;
    setSlideIndex(nextIndex);
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    isDraggingRef.current = false;
    activeTouchIdRef.current = null;
    gestureAxisRef.current = "pending";
  }, [initialSlideIndex, story.id, slideCount]);

  useEffect(() => {
    slideIndexRef.current = slideIndex;
    onSlideIndexChangeRef.current?.(slideIndex);
    onPreloadNextSlide?.(slideIndex);
  }, [onPreloadNextSlide, slideIndex]);

  useEffect(() => () => {
    removeWindowListenersRef.current?.();
  }, []);

  const previousSlideLabel = dict.navigation?.previousSlide || "Previous slide";
  const nextSlideLabel = dict.navigation?.nextSlide || "Next slide";
  const slideCounterTemplate = dict.slideCounter || "Slide {current} of {total}";

  const getFallbackForSlide = useMemo(
    () => (targetSlideIndex: number) => {
      const seed = `${story.id}-${targetSlideIndex}`;
      const index = Math.abs(
        Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0),
      ) % fallbackImages.length;

      return `/images/capybaras/${fallbackImages[index]}`;
    },
    [story.id],
  );

  const detachWindowListeners = () => {
    removeWindowListenersRef.current?.();
    removeWindowListenersRef.current = null;
  };

  const clearGesture = () => {
    activeTouchIdRef.current = null;
    gestureAxisRef.current = "pending";
    isDraggingRef.current = false;
    dragOffsetRef.current = 0;
    setIsDragging(false);
    setDragOffset(0);
  };

  const commitSlideChange = (nextIndex: number) => {
    const clampedIndex = clampSlideIndex(nextIndex);
    if (clampedIndex === slideIndexRef.current) {
      return;
    }

    setSlideIndex(clampedIndex);
  };

  const finishSwipe = () => {
    detachWindowListeners();
    const wasHorizontal = gestureAxisRef.current === "horizontal";
    const wasDragging = isDraggingRef.current;
    const finalDragOffset = dragOffsetRef.current;

    if (wasHorizontal) {
      onSwipeStateChangeRef.current?.(false);
    }

    clearGesture();

    if (!wasDragging) {
      return;
    }

    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);
    const velocity = Math.abs(finalDragOffset) / elapsed;
    const shouldNavigate =
      Math.abs(finalDragOffset) > SWIPE_DISTANCE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;

    if (!shouldNavigate || slideCount <= 1) {
      return;
    }

    const direction = finalDragOffset < 0 ? 1 : -1;
    commitSlideChange(slideIndexRef.current + direction);
  };

  const findTrackedTouch = (touches: TouchList) => {
    const activeTouchId = activeTouchIdRef.current;
    if (activeTouchId === null) {
      return null;
    }

    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch?.identifier === activeTouchId) {
        return touch;
      }
    }

    return null;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isDraggingRef.current) {
      return;
    }

    const touch = findTrackedTouch(event.touches);
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (gestureAxisRef.current === "pending") {
      if (absDeltaX < SWIPE_LOCK_THRESHOLD && absDeltaY < SWIPE_LOCK_THRESHOLD) {
        return;
      }

      if (absDeltaY > VERTICAL_CANCEL_THRESHOLD && absDeltaY > absDeltaX * 1.5) {
        gestureAxisRef.current = "vertical";
        finishSwipe();
        return;
      }

      if (absDeltaX < HORIZONTAL_CONFIRM_THRESHOLD || absDeltaX <= absDeltaY) {
        return;
      }

      gestureAxisRef.current = "horizontal";
      suppressClickRef.current = true;
      setIsDragging(true);
      onSwipeStateChangeRef.current?.(true);
    }

    if (gestureAxisRef.current !== "horizontal") {
      return;
    }

    event.preventDefault();

    const isAtStart = slideIndexRef.current === 0 && deltaX > 0;
    const isAtEnd = slideIndexRef.current === slideCount - 1 && deltaX < 0;
    const nextDragOffset = isAtStart || isAtEnd ? deltaX * 0.25 : deltaX;
    dragOffsetRef.current = nextDragOffset;
    setDragOffset(nextDragOffset);
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const touch = findTrackedTouch(event.changedTouches);
    if (!touch && activeTouchIdRef.current !== null) {
      return;
    }

    finishSwipe();
  };

  const attachTouchListeners = () => {
    detachWindowListeners();

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    removeWindowListenersRef.current = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    activeTouchIdRef.current = touch.identifier;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = performance.now();
    gestureAxisRef.current = "pending";
    dragOffsetRef.current = 0;
    isDraggingRef.current = true;
    suppressClickRef.current = false;
    attachTouchListeners();
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  if (!story || !story.slides || story.slides.length === 0) {
    if (!showEmptyError) {
      return (
        <div className="mobile-story-carousel mobile-story-carousel-loading">
          <img className="capybara-spinner" src="/spinners/capybara-spinner.webp" alt={story?.title || emptyMessage || "illustration"} />
        </div>
      );
    }

    return (
      <div className="mobile-story-carousel">
        <p className="story-error">{emptyMessage || "Не удалось загрузить кадры истории."}</p>
      </div>
    );
  }

  return (
    <div className="mobile-story-carousel">
      <div
        className="mobile-story-swipe-surface"
        onTouchStart={handleTouchStart}
        onTouchEnd={finishSwipe}
        onTouchCancel={finishSwipe}
        onClickCapture={handleClickCapture}
      >
        <div className="mobile-story-slide-shell">
          <div
            className="mobile-story-track"
            style={{
              transform: `translate3d(calc(${-slideIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {story.slides.map((slide, targetSlideIndex) => {
              const media = mediaCache?.get(targetSlideIndex) || null;
              const mediaUrl = media?.capybaraImage || media?.gifUrl || media?.imageUrl || getFallbackForSlide(targetSlideIndex);

              return (
                <div key={`${story.id}-${targetSlideIndex}`} className="mobile-story-slide">
                  <div className="mobile-story-media">
                    {media?.type === "video" && media.videoUrl ? (
                      <video
                        src={media.videoUrl}
                        className="mobile-story-media-asset"
                        draggable={false}
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={media?.capybaraImageAlt || slide.text?.trim() || story.title || "illustration"}
                        className="mobile-story-media-asset"
                        draggable={false}
                      />
                    )}
                    <div className="mobile-story-text">
                      <p className="mobile-story-text-copy">{slide.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mobile-story-footer">
        <div className="mobile-story-nav">
          <button
            type="button"
            className="mobile-story-nav-button"
            onClick={() => commitSlideChange(slideIndex - 1)}
            disabled={slideIndex === 0}
            aria-label={previousSlideLabel}
          >
            <span aria-hidden="true">←</span>
          </button>
          <p className="mobile-story-counter" dir={lang === "he" ? "rtl" : "ltr"}>
            {slideCounterTemplate
              .replace("{current}", String(slideIndex + 1))
              .replace("{total}", String(story.slides.length))}
          </p>
          <button
            type="button"
            className="mobile-story-nav-button"
            onClick={() => commitSlideChange(slideIndex + 1)}
            disabled={slideIndex === story.slides.length - 1}
            aria-label={nextSlideLabel}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
