import { useState } from "react";

export default function CatPage() {
  const [inputText, setInputText] = useState("");
  const [slides, setSlides] = useState<{ text: string; image?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSlides([]);

    try {
      const response = await fetch('/api/cat-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputText }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при запросе к серверу');
      }

      const data = await response.json();
      setSlides(data.slides);
    } catch (err) {
      setError("Что-то пошло не так.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cat-page-container">
      <h1 className="cat-page-title page-title">Котики объяснят</h1>
      <p className="cat-page-subtitle page-subtitle">Много маленьких котиков объяснят тебе всё на свете</p>
      <p className="example-title">Примеры:</p>
      <div className="example-buttons">
        <button className="example-button" onClick={() => setInputText("Как работает двигатель внутреннего сгорания?")}>
          Как работает двигатель внутреннего сгорания?
        </button>
        <button className="example-button" onClick={() => setInputText("Что такое пассионарность?")}>
          Что такое пассионарность?
        </button>
        <button className="example-button" onClick={() => setInputText("Зачем человеку сны?")}>
          Зачем человеку сны?
        </button>
      </div>
      <div className="input-wrapper search-input-wrapper">
        <input
          className="question-input search-input"
          type="text"
          placeholder="Или задай свой вопрос"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          className="ask-button search-button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Котики думают..." : "Задать!"}
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="slide-container">
        {loading ? (
  <div className="cat-spinner-wrapper">
    <img src="/spinners/CatSpinner.svg" alt="Котик думает..." width={64} height={64} />
    <p className="cat-spinner-text">Котики думают над ответом на твой вопрос...</p>
  </div>
) : (
          <div className="slide-scroll-wrapper">
            {slides.map((slide, idx) => {
              if (!slide.text || !slide.image) return null;

              return (
                <div key={idx} className="cat-slide">
                  {slide.image.endsWith('.mp4') ? (
                    <video
                      className="cat-slide-video"
                      controls
                      autoPlay
                      muted
                      playsInline
                    >
                      <source src={slide.image} type="video/mp4" />
                      Ваш браузер не поддерживает видео.
                    </video>
                  ) : (
                    <img src={slide.image} alt={`Slide ${idx + 1}`} className="cat-slide-image" />
                  )}
                  <div
                    className="cat-slide-text"
                    dangerouslySetInnerHTML={{ __html: slide.text }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button className="random-question-button random-book-button" onClick={async () => {
        setLoading(true);
        setError(null);
        setSlides([]);
        try {
          const response = await fetch('/api/cat-slides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            throw new Error('Ошибка при запросе к серверу');
          }

          const data = await response.json();
          if (!data.prompt) {
            console.warn("Сервер не вернул prompt. Проверь API /api/cat-slides.");
          }
          setInputText(data.prompt || "");
          setSlides(data.slides);
        } catch (err) {
          setError("Что-то пошло не так.");
        } finally {
          setLoading(false);
        }
      }}>
        Случайный вопрос 🎲
      </button>
      <img src="/cat/mouse-hanging.webp" className="hanging-mouse" />
      
      <footer className="giphy-footer">
        <img src="/cat/ball.webp" alt="Клубочек" className="rolling-ball" />
        <p className="giphy-attribution-text">GIFs powered by</p>
        <img src="/giphy-logo.webp" alt="GIPHY Logo" className="giphy-logo" />
        <p className="pexels-credit">
  Видео предоставлено <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>.
</p>
      </footer>
    </div>
  );
}