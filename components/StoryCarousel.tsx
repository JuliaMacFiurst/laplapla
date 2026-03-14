import { useState, useEffect } from "react";
import type { CarouselStory } from "../types/types";
import { fallbackImages } from "../constants";

interface StoryCarouselProps {
  story: CarouselStory;
  textClassName?: string;
  emptyMessage?: string;
}

const StoryCarousel: React.FC<StoryCarouselProps> = ({ story, textClassName, emptyMessage }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    setCurrentSlideIndex(0);
  }, [story.id]);

  const handleNextSlide = () => {
    setCurrentSlideIndex((prevIndex) =>
      prevIndex < story.slides.length - 1 ? prevIndex + 1 : prevIndex
    );
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : prevIndex
    );
  };

  if (!story || !story.slides || story.slides.length === 0) {
    return (
      <div className="story-container">
        <p className="story-error">{emptyMessage || "Не удалось загрузить кадры истории."}</p>
      </div>
    );
  }

  const currentSlide = story.slides[currentSlideIndex];

  const fallback = `/images/capybaras/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;
  
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
        <h2 className="story-title" style={{ zIndex: 2 }}>
          {story.title}
        </h2>
        
        <div className="story-content">
          <div className="story-image-wrapper">
            {currentSlide && (
              <>
                {currentSlide.type === "image" && currentSlide.capybaraImage ? (
                  <img
                    className="story-image"
                    src={currentSlide.capybaraImage}
                    alt={currentSlide.capybaraImageAlt || "Капибара"}
                  />
                ) : currentSlide.type === "gif" && currentSlide.gifUrl ? (
                  <img
                    className="story-image"
                    src={currentSlide.gifUrl}
                    alt="GIF"
                  />
                ) : currentSlide.type === "video" && currentSlide.videoUrl ? (
                  <video
                    src={currentSlide.videoUrl}
                    className="story-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : currentSlide.imageUrl ? (
                  <img
                    src={currentSlide.imageUrl}
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
            )}
          </div>
          <p className={textClassName || "slide-text"}>{currentSlide.text}</p>
        </div>

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
  );
};

export default StoryCarousel;
