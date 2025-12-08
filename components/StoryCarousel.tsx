import {useState, useEffect, JSX } from 'react';
import type { ProcessedStory } from '../types';
import { fallbackImages } from '../constants';

interface StoryCarouselProps {
  story: ProcessedStory;
  textClassName?: string;
  renderSlide?: (slide: any) => JSX.Element;
}

const StoryCarousel: React.FC<StoryCarouselProps> = ({ story, textClassName }) => {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Reset to first sentence if story changes
  useEffect(() => {
    setCurrentSentenceIndex(0);
  }, [story.id]);

  const handleNextSentence = () => {
    setCurrentSentenceIndex((prevIndex) => 
      prevIndex < story.sentences.length - 1 ? prevIndex + 1 : prevIndex
    );
  };

  const handlePrevSentence = () => {
    setCurrentSentenceIndex((prevIndex) => 
      prevIndex > 0 ? prevIndex - 1 : prevIndex
    );
  };

  if (!story || !story.sentences || story.sentences.length === 0) {
    return (
      <div className="story-container">
        <p className="story-error">Не удалось загрузить кадры истории.</p>
      </div>
    );
  }

  const currentSentence = story.sentences[currentSentenceIndex];
  console.log('Текущий слайд:', currentSentence);

  const fallback = `/images/capybaras/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;
  
  return (
    
    <div className="story-wrapper">
      <div
        className="story-inner"
        style={{
          backgroundImage: currentSentence.backgroundImage
            ? `url(${currentSentence.backgroundImage})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          className="story-background-blur"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: currentSentence.backgroundImage
              ? `url(${currentSentence.backgroundImage})`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(16px)',
            zIndex: 0,
          }}
        />
        <h2 className="story-title" style={{ zIndex: 2 }}>
          {story.title}
        </h2>
        
        <div className="story-content">
          <div className="story-image-wrapper">
           
            {currentSentence && (
              <>
                {currentSentence.type === 'image' && currentSentence.capybaraImage ? (
                  <img
                    className="story-image"
                    src={currentSentence.capybaraImage}
                    alt={currentSentence.capybaraImageAlt || 'Капибара'}
                  />
                ) : currentSentence.type === 'gif' && currentSentence.gifUrl ? (
                  <img
                    className="story-image"
                    src={currentSentence.gifUrl}
                    alt="GIF"
                  />
                ) : currentSentence.type === 'video' && currentSentence.videoUrl ? (
                  <video
                    src={currentSentence.videoUrl}
                    className="story-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : currentSentence.imageUrl ? (
                  <img
                    src={currentSentence.imageUrl}
                    alt="Фото капибары с Pexels"
                    className="story-image"
                    style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%' }}
                  />
                ) : (
                  <img
                    className="story-image"
                    src={fallback}
                    alt="Запасная капибара"
                    style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%' }}
                  />
                )}
              </>
            )}
          </div>
          <p className={textClassName || 'slide-text'}>{currentSentence.text}</p>
        </div>

        <div className="story-nav">
          <div className="story-nav-inner">
            <button
              onClick={handlePrevSentence}
              disabled={currentSentenceIndex === 0}
              aria-label="Предыдущий кадр"
              className="arrow-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="arrow-icon">
                <path fillRule="evenodd" d="M12.53 3.47a.75.75 0 010 1.06L7.06 10l5.47 5.47a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" />
              </svg>
            </button>
            <p className="slide-counter">
              Кадр {currentSentenceIndex + 1} из {story.sentences.length}
            </p>
            <button
              onClick={handleNextSentence}
              disabled={currentSentenceIndex === story.sentences.length - 1}
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