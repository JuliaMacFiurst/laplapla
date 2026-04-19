import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  currentSlideIndex: number;
  onSlideIndexChange: (slideIndex: number) => void;
  onSwipeStateChange?: (isSwiping: boolean) => void;
  isFindingNewImage?: boolean;
  emptyMessage?: string;
  mediaCache?: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide?: (slideIndex: number) => void;
  showEmptyError?: boolean;
}

const SWIPE_DISTANCE_THRESHOLD = 34;
const SWIPE_VELOCITY_THRESHOLD = 0.18;

export default function MobileStoryCarousel({
  story,
  lang,
  t,
  currentSlideIndex,
  onSlideIndexChange,
  onSwipeStateChange,
  emptyMessage,
  mediaCache,
  onPreloadNextSlide,
  showEmptyError,
}: MobileStoryCarouselProps) {
  const dict = t ?? dictionaries[lang]?.capybaras?.capybaraPage ?? dictionaries.ru.capybaras.capybaraPage;
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isHorizontalRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentSlideIndex >= story.slides.length && story.slides.length > 0) {
      onSlideIndexChange(0);
    }
  }, [currentSlideIndex, onSlideIndexChange, story.slides.length]);

  useEffect(() => {
    onPreloadNextSlide?.(currentSlideIndex);
  }, [currentSlideIndex, onPreloadNextSlide, story.id]);

  const previousSlideLabel = dict.navigation?.previousSlide || "Previous slide";
  const nextSlideLabel = dict.navigation?.nextSlide || "Next slide";
  const slideCounterTemplate = dict.slideCounter || "Slide {current} of {total}";

  const getFallbackForSlide = useMemo(
    () => (slideIndex: number) => {
      const index = Math.abs(
        Array.from(`${story.id}-${slideIndex}`).reduce((acc, char) => acc + char.charCodeAt(0), 0),
      ) % fallbackImages.length;

      return `/images/capybaras/${fallbackImages[index]}`;
    },
    [story.id],
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    startTimeRef.current = performance.now();
    isHorizontalRef.current = false;
    dragOffsetRef.current = 0;
    isDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId || !isDraggingRef.current) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (!isHorizontalRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
        isDraggingRef.current = false;
        dragOffsetRef.current = 0;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        activePointerIdRef.current = null;
        onSwipeStateChange?.(false);
        setIsDragging(false);
        setDragOffset(0);
        return;
      }

      if (Math.abs(deltaX) < 6) {
        return;
      }

      isHorizontalRef.current = true;
      onSwipeStateChange?.(true);
    }

    event.preventDefault();

    const isAtStart = currentSlideIndex === 0 && deltaX > 0;
    const isAtEnd = currentSlideIndex === story.slides.length - 1 && deltaX < 0;
    const nextDragOffset = isAtStart || isAtEnd ? deltaX * 0.25 : deltaX;
    dragOffsetRef.current = nextDragOffset;
    setDragOffset(nextDragOffset);
  };

  const finishSwipe = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;
    if (isHorizontalRef.current) {
      onSwipeStateChange?.(false);
    }
    isHorizontalRef.current = false;

    if (!isDraggingRef.current) {
      dragOffsetRef.current = 0;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    isDraggingRef.current = false;
    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);
    const finalDragOffset = dragOffsetRef.current;
    const velocity = Math.abs(finalDragOffset) / elapsed;
    const shouldNavigate =
      Math.abs(finalDragOffset) > SWIPE_DISTANCE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldNavigate && story.slides.length > 1) {
      const direction = finalDragOffset < 0 ? 1 : -1;
      const nextIndex = Math.min(Math.max(currentSlideIndex + direction, 0), story.slides.length - 1);

      if (nextIndex !== currentSlideIndex) {
        onSlideIndexChange(nextIndex);
      }
    }

    setIsDragging(false);
    dragOffsetRef.current = 0;
    setDragOffset(0);
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSwipe}
        onPointerCancel={finishSwipe}
        onLostPointerCapture={finishSwipe}
      >
        <div className="mobile-story-slide-shell">
          <div
            className="mobile-story-track"
            style={{
              transform: `translate3d(calc(${-currentSlideIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {story.slides.map((slide, slideIndex) => {
              const media = mediaCache?.get(slideIndex) || null;
              const mediaUrl = media?.capybaraImage || media?.gifUrl || media?.imageUrl || getFallbackForSlide(slideIndex);

              return (
                <div key={`${story.id}-${slideIndex}`} className="mobile-story-slide">
                  <div className="mobile-story-media">
                    {media?.type === "video" && media.videoUrl ? (
                      <video
                        src={media.videoUrl}
                        className="mobile-story-media-asset"
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
            onClick={() => onSlideIndexChange(Math.max(currentSlideIndex - 1, 0))}
            disabled={currentSlideIndex === 0}
            aria-label={previousSlideLabel}
          >
            <span aria-hidden="true">←</span>
          </button>
          <p className="mobile-story-counter" dir={lang === "he" ? "rtl" : "ltr"}>
            {slideCounterTemplate
              .replace("{current}", String(currentSlideIndex + 1))
              .replace("{total}", String(story.slides.length))}
          </p>
          <button
            type="button"
            className="mobile-story-nav-button"
            onClick={() => onSlideIndexChange(Math.min(currentSlideIndex + 1, story.slides.length - 1))}
            disabled={currentSlideIndex === story.slides.length - 1}
            aria-label={nextSlideLabel}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
