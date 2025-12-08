import {useState, useEffect, useCallback, FormEvent } from 'react';
import type { ProcessedStory, GeminiBookStory, SentenceSlide, LoadStoryOptions } from '../types';
import { KAWAII_BACKGROUND_COLORS } from '../constants';
import { getBackgroundForSentence } from '../utils/getBackgroundForSentence';
import StoryCarousel from '../components/StoryCarousel';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { fetchSingleBookStory } from './api/capybara-slides';

const getRandomElement = <T,>(arr: T[]): T => {
  if (!arr || arr.length === 0) {
    if (process.env.NODE_ENV === 'development') {
        console.warn('getRandomElement called with an empty array.');
    }
    if (typeof arr === 'object' && Array.isArray(arr) && arr.length === 0) {
        return { id: 'fallback', src: '/images/fallback.webp', alt: 'Fallback image', keywords: [] } as any;
    }
    return undefined as T; 
  }
  return arr[Math.floor(Math.random() * arr.length)];
};

const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const sentences = text.match(/[^.!?…]+(?:[.!?…]|\B['"]?\s|$)+/g);
  return sentences ? sentences.map(s => s.trim()).filter(s => s.length > 3) : [text.trim()].filter(s => s.length > 3);
};

// List of interjections and short non-substantive phrases to filter out
const NOISE_PHRASES = [
  "фыр-фыр", "мур-мур", "хруп-хруп", "ох-ох", "мяу-мяу", "кхм-кхм", "фырк", "хрум", "мурк", "хрясь", "бульк"
  // Add more common capybara sounds if needed
];
const MIN_MEANINGFUL_WORDS_AFTER_CLEANING = 3; // Minimum words a sentence should have after cleaning noise

const App: React.FC = () => {
  const [currentProcessedStory, setCurrentProcessedStory] = useState<ProcessedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchErrorTitle, setSearchErrorTitle] = useState<string | undefined>(undefined);

  const loadNewStory = useCallback(async (options?: LoadStoryOptions) => {
    setIsLoading(true);
    setError(null);
    setSearchErrorTitle(undefined);
    setCurrentProcessedStory(null); 

    try {
      const storyData: GeminiBookStory = await fetchSingleBookStory(options);

      if (!storyData || !storyData.summary) {
        setError("Капибара ничего не рассказала — история пуста!");
        setSearchErrorTitle("История не пришла");
        setCurrentProcessedStory(null);
      } else {
        const sentencesRaw = splitIntoSentences(storyData.summary);

        const filteredSentences = sentencesRaw.filter(sentence => {
          let cleanedSentence = sentence.toLowerCase();
          NOISE_PHRASES.forEach(phrase => {
            const regexSafePhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanedSentence = cleanedSentence.replace(new RegExp(regexSafePhrase, 'gi'), '');
          });
          cleanedSentence = cleanedSentence.replace(/[.!?,…"“"();:'-]/g, '').trim();
          const words = cleanedSentence.split(/\s+/).filter(word => word.length > 0);
          return words.length >= MIN_MEANINGFUL_WORDS_AFTER_CLEANING;
        });

        if (filteredSentences.length === 0) {
          setError("Капибара рассказала такую короткую историю (или в ней было слишком много 'фыр-фыр'!), что мы не смогли ее показать! Попробуйте сгенерировать другую.");
          setSearchErrorTitle("Слишком мало смысла");
          setCurrentProcessedStory(null);
        } else {
          // --- ВСТАВКА ИЗОБРАЖЕНИЙ ---
          const imagesResponse = await fetch('/api/capybara-images');
          const images = await imagesResponse.json();

          const gifsResponse = await fetch('/api/capybara-gifs');
          const gifs = await gifsResponse.json();

          const sentencesWithMedia: SentenceSlide[] = filteredSentences.map((sentence, index) => {
            const gifFromApi = gifs[index % gifs.length];
            const imageFromApi = images[index % images.length];

            if (gifFromApi?.gifUrl) {
              return {
                text: sentence,
                gifUrl: gifFromApi.gifUrl,
                type: 'gif',
                capybaraImage: '',
                capybaraImageAlt: '',
                backgroundImage: '',
              };
            }

            const capybaraImage = imageFromApi?.imageUrl || '';
            const capybaraImageAlt = imageFromApi ? 'Капибара с Pexels' : '';
            const background = getBackgroundForSentence(sentence);

            return {
              text: sentence,
              capybaraImage,
              capybaraImageAlt,
              backgroundImage: background,
              type: 'image',
              gifUrl: '',
            };
          });

          // --- ВСТАВКА ВИДЕО ---
          const response = await fetch('/api/capybara-videos');
          const videos = await response.json();

          const interval = Math.ceil(sentencesWithMedia.length / (videos.length + 1));
          let videoIndex = 0;

          const mixedSentences = sentencesWithMedia.map((sentence, i) => {
            const newSentence = { ...sentence };
            const insertVideoHere = (i > 0 && i % interval === 0 && videoIndex < videos.length);

            if (insertVideoHere) {
              newSentence.videoUrl = videos[videoIndex].videoUrl;
              newSentence.type = 'video';
              videoIndex++;
            }

            return newSentence;
          });
          // --- КОНЕЦ ВСТАВКИ ВИДЕО ---

          const processedStory: ProcessedStory = {
            id: `story-${Date.now()}`,
            title: storyData.title,
            sentences: mixedSentences,
            backgroundColor: getRandomElement(KAWAII_BACKGROUND_COLORS) || 'bg-amber-100',
          };
          setCurrentProcessedStory(processedStory);
        }
      }
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Произошла неизвестная ошибка при загрузке новой истории.';
      setError(errorMessage);
      setSearchErrorTitle("Ошибка загрузки");
      console.error(err);
      setCurrentProcessedStory(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNewStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleRandomRealStory = () => {
    setSearchQuery(''); 
    loadNewStory({ generateForRandomChildrensBook: true }); 
  };

  const handleInventStoryClick = () => {
    setSearchQuery('');
    loadNewStory({ inventStory: true });
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      loadNewStory(); 
      return;
    }
    loadNewStory({ bookTitle: searchQuery.trim() });
  };
  
  const showLoadingSpinner = isLoading && !error; 
  const showErrorDisplay = error && !isLoading;

  return (
    <div className="capybara-page-container">
      <header className="capybara-page-header">
        <h1 className="page-title">
          Капибары расскажут
        </h1>
        <p className="page-subtitle">Милые капибары пересказывают сюжеты известных книг или придумывают свои истории по кадрам!</p>
        
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Какую книгу ищем? (напр. 'Маленький принц')"
              className="search-input"
              aria-label="Поиск книги"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="search-button"
            >
              Найти
            </button>
          </div>
        </form>
        <div className="invent-story-button-wrapper">
            <button
                onClick={handleInventStoryClick}
                disabled={isLoading}
                className="invent-story-button"
            >
                ✨ Придумай историю! ✨
            </button>
        </div>

      </header>

      <main className="capybara-page-main">
        {showLoadingSpinner && ( 
          <div className="loading-spinner-container">
            <LoadingSpinner />
          </div>
        )}
        {showErrorDisplay && (
          <div className="error-message-container">
            <ErrorMessage message={error} customTitle={searchErrorTitle} />
            <button
              onClick={handleRandomRealStory} 
              className="try-random-book-button"
            >
              Попробовать случайную книгу
            </button>
          </div>
        )}
        {currentProcessedStory && !isLoading && !error && (
          <StoryCarousel
            story={currentProcessedStory}
            textClassName="story-carousel-text"
            renderSlide={(slide) => (
              <>
                {slide && slide.type && (
                  <>
                    {slide.type === 'image' && slide.capybaraImage && (
                      <img
                        className="story-image"
                        src={slide.capybaraImage}
                        alt={slide.capybaraImageAlt}
                      />
                    )}
                    {slide.type === 'gif' && typeof slide.gifUrl === 'string' && (
                      <img
                        className="story-image"
                        src={slide.gifUrl}
                        alt="GIF"
                      />
                    )}
                  </>
                )}
              </>
            )}
          />
        )}
        {!currentProcessedStory && !isLoading && !error && ( 
             <div className="no-stories-message">
                <div className="no-stories-emoji">🐾</div>
                <h3 className="no-stories-title">Историй пока нет!</h3>
                <p className="no-stories-text">Попробуйте поискать книгу, попросить капибару придумать историю или нажмите кнопку ниже для случайной книги!</p>
             </div>
        )}
      </main>
      
      <div className="random-book-button-wrapper">
        <button
          onClick={handleRandomRealStory}
          disabled={isLoading}
          className="random-book-button"
          aria-label="Рассказать случайную существующую книгу"
        >
          📖 Случайная книга! 📖
        </button>
      </div>

      <footer className="capybara-page-footer">
        <p>Создано с ❤️ для маленьких читателей и любителей капибар!</p>
        <p>Иллюстрации милых капибар подготовлены специально для этого приложения.</p>
        <p className="footer-license-note">Наши котики и капибары нарисованы художниками с Veecteezy.com — спасибо за их чудесные лапки! (Лицензия: Free with attribution)</p>
        <p className="pexels-credit">
  Видео предоставлено <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>.
</p>
      </footer>
    </div>
  );
};

export default App;