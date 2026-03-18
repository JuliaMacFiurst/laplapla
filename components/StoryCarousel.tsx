import { useState, useEffect } from "react";
import type { CarouselStory } from "../types/types";
import { fallbackImages } from "../constants";

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
  currentSlideIndex: number;
  onSlideIndexChange: (slideIndex: number) => void;
  textClassName?: string;
  emptyMessage?: string;
  mediaCache?: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide?: (slideIndex: number) => void;
}

const StoryCarousel: React.FC<StoryCarouselProps> = ({
  story,
  currentSlideIndex,
  onSlideIndexChange,
  textClassName,
  emptyMessage,
  mediaCache,
  onPreloadNextSlide,
}) => {
  const [showError, setShowError] = useState(false);
  const [lockedMedia, setLockedMedia] = useState<SlideMedia | null>(null);

  useEffect(() => {
    if (currentSlideIndex >= story.slides.length && story.slides.length > 0) {
      onSlideIndexChange(0);
    }
  }, [currentSlideIndex, onSlideIndexChange, story.slides.length]);

  useEffect(() => {
    setLockedMedia(mediaCache?.get(currentSlideIndex) || null);
    onPreloadNextSlide?.(currentSlideIndex);
  }, [currentSlideIndex, onPreloadNextSlide, story.id]);

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

  const currentSlide = story.slides[currentSlideIndex];
  const currentMedia = lockedMedia;
  const fallback = `/images/capybaras/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;
  const hasMedia =
    Boolean(currentMedia?.capybaraImage) ||
    Boolean(currentMedia?.gifUrl) ||
    Boolean(currentMedia?.videoUrl) ||
    Boolean(currentMedia?.imageUrl);
  
  return (
    <div className="story-wrapper">
      <div className="story-inner">
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
          <div className="story-media">
            <div className="story-image-wrapper">
              {currentSlide && hasMedia ? (
                <>
                  {currentMedia?.type === "image" && currentMedia.capybaraImage ? (
                    <img
                      className="story-image"
                      src={currentMedia.capybaraImage}
                      alt={currentMedia.capybaraImageAlt || "Капибара"}
                    />
                  ) : currentMedia?.type === "gif" && currentMedia.gifUrl ? (
                    <img
                      className="story-image"
                      src={currentMedia.gifUrl}
                      alt="GIF"
                    />
                  ) : currentMedia?.type === "video" && currentMedia.videoUrl ? (
                    <video
                      src={currentMedia.videoUrl}
                      className="story-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : currentMedia?.imageUrl ? (
                    <img
                      src={currentMedia.imageUrl}
                      alt="Фото капибары с Pexels"
                      className="story-image"
                      style={{ objectFit: "contain", maxHeight: "100%", maxWidth: "100%" }}
                    />
                  ) : (
                    <img
                      className="story-image"
                      src={fallback}
                      alt="Запасная капибара"
                      style={{ objectFit: "contain", maxHeight: "100%", maxWidth: "100%" }}
                    />
                  )}
                </>
              ) : (
                <div className="story-media-placeholder">
                  <img
                    className="capybara-spinner"
                    src="/spinners/capybara-spinner.webp"
                    alt="Загрузка медиа"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="story-text">
            <p className={textClassName || "slide-text"}>{currentSlide.text}</p>
          </div>

          <div className="story-navigation">
            <div className="story-nav">
              <div className="story-nav-inner">
                <button
                  onClick={handlePrevSlide}
                  disabled={currentSlideIndex === 0}
                  aria-label="Предыдущий кадр"
                  className="arrow-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="arrow-icon">
                    <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 010 1.06L7.06 10l5.47 5.47a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <p className="slide-counter">
                  Кадр {currentSlideIndex + 1} из {story.slides.length}
                </p>
                <button
                  onClick={handleNextSlide}
                  disabled={currentSlideIndex === story.slides.length - 1}
                  aria-label="Следующий кадр"
                  className="arrow-button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="arrow-icon">
                    <path fillRule="evenodd" d="M7.47 16.53a.75.75 0 010-1.06L12.94 10 7.47 4.53a.75.75 0 111.06-1.06l6 6a.75.75 0 010 1.06l-6 6a.75.75 0 01-1.06 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryCarousel;
