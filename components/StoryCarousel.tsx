import { useState, useEffect } from "react";
import { useAutoFontSize } from "@/hooks/useAutoFontSize";
import { dictionaries, type Lang } from "@/i18n";
import type { CarouselStory } from "../types/types";
import { fallbackImages } from "../constants";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

interface StoryCarouselProps {
  story: CarouselStory;
  lang: Lang;
  t?: CapybaraPageDict;
  currentSlideIndex: number;
  onSlideIndexChange: (slideIndex: number) => void;
  onFindNewImage?: (slideIndex: number) => void | Promise<void>;
  isFindingNewImage?: boolean;
  textClassName?: string;
  emptyMessage?: string;
  mediaCache?: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide?: (slideIndex: number) => void;
}

const StoryCarousel: React.FC<StoryCarouselProps> = ({
  story,
  lang,
  t,
  currentSlideIndex,
  onSlideIndexChange,
  onFindNewImage,
  isFindingNewImage,
  textClassName,
  emptyMessage,
  mediaCache,
  onPreloadNextSlide,
}) => {
  const dict = t ?? dictionaries[lang]?.capybaras?.capybaraPage ?? dictionaries.ru.capybaras.capybaraPage;
  const [showError, setShowError] = useState(false);
  const [lockedMedia, setLockedMedia] = useState<SlideMedia | null>(null);
  const [isPortraitMedia, setIsPortraitMedia] = useState(false);
  const textRef = useAutoFontSize<HTMLParagraphElement>([
    story.id,
    currentSlideIndex,
    story.slides[currentSlideIndex]?.text,
  ]);

  useEffect(() => {
    if (currentSlideIndex >= story.slides.length && story.slides.length > 0) {
      onSlideIndexChange(0);
    }
  }, [currentSlideIndex, onSlideIndexChange, story.slides.length]);

  useEffect(() => {
    setLockedMedia(mediaCache?.get(currentSlideIndex) || null);
    setIsPortraitMedia(false);
    onPreloadNextSlide?.(currentSlideIndex);
  }, [currentSlideIndex, mediaCache, onPreloadNextSlide, story.id]);

  useEffect(() => {
    if (story && story.slides && story.slides.length > 0) {
      setShowError(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowError(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [story]);

  if (!story || !story.slides || story.slides.length === 0) {
    if (!showError) {
      return (
        <div className="story-wrapper story-wrapper-loading" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
          <img 
            className="capybara-spinner"
            src="/spinners/capybara-spinner.webp"
            alt="Загрузка"
            style={{ width: "120px", height: "120px", objectFit: "contain" }}
          />
        </div>
      );
    }

    return (
      <div className="story-wrapper">
        <p className="story-error">{emptyMessage || "Не удалось загрузить кадры истории."}</p>
      </div>
    );
  }

  const handleNextSlide = () => {
    if (currentSlideIndex < story.slides.length - 1) {
      onSlideIndexChange(currentSlideIndex + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      onSlideIndexChange(currentSlideIndex - 1);
    }
  };

  const previousSlideLabel = dict.navigation?.previousSlide || "Previous slide";
  const nextSlideLabel = dict.navigation?.nextSlide || "Next slide";
  const slideCounterTemplate = dict.slideCounter || "Slide {current} of {total}";
  const findNewImageLabel = dict.actions?.findNewImage || "Найти новую картинку";

  const currentSlide = story.slides[currentSlideIndex];
  const currentMedia = lockedMedia;
  const fallback = `/images/capybaras/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;
  const hasMedia =
    Boolean(currentMedia?.capybaraImage) ||
    Boolean(currentMedia?.gifUrl) ||
    Boolean(currentMedia?.videoUrl) ||
    Boolean(currentMedia?.imageUrl);
  const textWordCount = currentSlide?.text.trim().split(/\s+/).filter(Boolean).length || 0;
  const compactText = textWordCount > 12;
  const denseText = textWordCount > 20;
  const portraitLayout = isPortraitMedia || currentMedia?.type === "video";

  const renderSlideMedia = (classNameSuffix = "") => {
    if (!currentSlide || !hasMedia) {
      return (
        <div className="story-media-placeholder">
          <img
            className="capybara-spinner"
            src="/spinners/capybara-spinner.webp"
            alt="Загрузка медиа"
          />
        </div>
      );
    }

    if (currentMedia?.type === "image" && currentMedia.capybaraImage) {
      return (
        <img
          className={`story-image${classNameSuffix}`}
          src={currentMedia.capybaraImage}
          alt={currentMedia.capybaraImageAlt || "Капибара"}
          onLoad={(event) => {
            const image = event.currentTarget;
            setIsPortraitMedia(image.naturalHeight > image.naturalWidth * 1.05);
          }}
        />
      );
    }

    if (currentMedia?.type === "gif" && currentMedia.gifUrl) {
      return (
        <img
          className={`story-image${classNameSuffix}`}
          src={currentMedia.gifUrl}
          alt="GIF"
          onLoad={(event) => {
            const image = event.currentTarget;
            setIsPortraitMedia(image.naturalHeight > image.naturalWidth * 1.05);
          }}
        />
      );
    }

    if (currentMedia?.type === "video" && currentMedia.videoUrl) {
      return (
        <video
          src={currentMedia.videoUrl}
          className={`story-video${classNameSuffix}`}
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setIsPortraitMedia(video.videoHeight > video.videoWidth * 1.05);
          }}
        />
      );
    }

    if (currentMedia?.imageUrl) {
      return (
        <img
          src={currentMedia.imageUrl}
          alt="Фото капибары с Pexels"
          className={`story-image${classNameSuffix}`}
          onLoad={(event) => {
            const image = event.currentTarget;
            setIsPortraitMedia(image.naturalHeight > image.naturalWidth * 1.05);
          }}
        />
      );
    }

    return (
      <img
        className={`story-image${classNameSuffix}`}
        src={fallback}
        alt="Запасная капибара"
        onLoad={(event) => {
          const image = event.currentTarget;
          setIsPortraitMedia(image.naturalHeight > image.naturalWidth * 1.05);
        }}
      />
    );
  };
  
  return (
    <div className="story-wrapper">
      <div className={`story-inner${portraitLayout ? " story-inner-portrait" : ""}`}>
        {portraitLayout ? (
          <div className="story-media-backdrop">
            {renderSlideMedia(" story-backdrop-media")}
          </div>
        ) : null}
        <div
          className="story-background-blur"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        />
        <div className="story-content">
          <div className={`story-text${compactText ? " story-text-compact" : ""}${denseText ? " story-text-dense" : ""}`}>
            <p
              ref={textRef}
              className={`${textClassName || "slide-text"}${compactText ? " story-carousel-text-compact" : ""}${denseText ? " story-carousel-text-dense" : ""}`}
            >
              {currentSlide.text}
            </p>
          </div>

          {!portraitLayout ? (
            <div className="story-media">
              {renderSlideMedia("")}
            </div>
          ) : null}

          <div className="story-navigation">
            <div className="story-nav">
              <div className="story-nav-inner">
                <button
                  onClick={handlePrevSlide}
                  disabled={currentSlideIndex === 0}
                  aria-label={previousSlideLabel}
                  className="arrow-button"
                  dir="ltr"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="arrow-icon">
                    <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 010 1.06L7.06 10l5.47 5.47a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <p className="slide-counter" dir={lang === "he" ? "rtl" : "ltr"}>
                  {slideCounterTemplate
                    .replace("{current}", String(currentSlideIndex + 1))
                    .replace("{total}", String(story.slides.length))}
                </p>
                <button
                  onClick={handleNextSlide}
                  disabled={currentSlideIndex === story.slides.length - 1}
                  aria-label={nextSlideLabel}
                  className="arrow-button"
                  dir="ltr"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="arrow-icon">
                    <path fillRule="evenodd" d="M7.47 16.53a.75.75 0 010-1.06L12.94 10 7.47 4.53a.75.75 0 111.06-1.06l6 6a.75.75 0 010 1.06l-6 6a.75.75 0 01-1.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            {onFindNewImage ? (
              <div className="slideshow-refresh-button-row">
                <button
                  type="button"
                  className="studio-button btn-mint map-popup-action-button slideshow-refresh-button"
                  disabled={isFindingNewImage}
                  onClick={() => void onFindNewImage(currentSlideIndex)}
                >
                  {isFindingNewImage ? "..." : findNewImageLabel}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCarousel;
