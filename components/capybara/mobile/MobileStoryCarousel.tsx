import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
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
  emptyMessage,
  mediaCache,
  onPreloadNextSlide,
  showEmptyError,
}: MobileStoryCarouselProps) {
  const dict = t ?? dictionaries[lang]?.capybaras?.capybaraPage ?? dictionaries.ru.capybaras.capybaraPage;
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">("forward");
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const previousSlideIndexRef = useRef(currentSlideIndex);
  const animationTimerRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isHorizontalRef = useRef(false);

  useEffect(() => {
    if (currentSlideIndex >= story.slides.length && story.slides.length > 0) {
      onSlideIndexChange(0);
    }
  }, [currentSlideIndex, onSlideIndexChange, story.slides.length]);

  useEffect(() => {
    onPreloadNextSlide?.(currentSlideIndex);
  }, [currentSlideIndex, onPreloadNextSlide, story.id]);

  useEffect(() => {
    if (previousSlideIndexRef.current === currentSlideIndex) {
      return;
    }

    setFlipDirection(currentSlideIndex > previousSlideIndexRef.current ? "forward" : "backward");
    previousSlideIndexRef.current = currentSlideIndex;
    setIsAnimating(true);

    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current);
    }

    animationTimerRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animationTimerRef.current = null;
    }, 320);

    return () => {
      if (animationTimerRef.current) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [currentSlideIndex]);

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

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = performance.now();
    isHorizontalRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    if (!isHorizontalRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25) {
        setIsDragging(false);
        setDragOffset(0);
        return;
      }

      if (Math.abs(deltaX) < 6) {
        return;
      }

      isHorizontalRef.current = true;
    }

    event.preventDefault();

    const isAtStart = currentSlideIndex === 0 && deltaX > 0;
    const isAtEnd = currentSlideIndex === story.slides.length - 1 && deltaX < 0;
    setDragOffset(isAtStart || isAtEnd ? deltaX * 0.25 : deltaX);
  };

  const finishSwipe = () => {
    if (!isDragging) {
      setDragOffset(0);
      return;
    }

    const elapsed = Math.max(performance.now() - startTimeRef.current, 1);
    const velocity = Math.abs(dragOffset) / elapsed;
    const shouldNavigate =
      Math.abs(dragOffset) > SWIPE_DISTANCE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldNavigate && story.slides.length > 1) {
      const direction = dragOffset < 0 ? 1 : -1;
      const nextIndex = Math.min(Math.max(currentSlideIndex + direction, 0), story.slides.length - 1);

      if (nextIndex !== currentSlideIndex) {
        onSlideIndexChange(nextIndex);
      }
    }

    setIsDragging(false);
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishSwipe}
        onTouchCancel={finishSwipe}
      >
        <div className={`mobile-story-slide-shell ${isAnimating ? `mobile-story-slide-shell-${flipDirection}` : ""}`}>
          <div
            className="mobile-story-track"
            style={{
              transform: `translateX(calc(${-currentSlideIndex * 100}% + ${dragOffset}px))`,
              transition: isDragging ? "none" : "transform 300ms ease-out",
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
