import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { dictionaries } from "../i18n";

export default function CatPage() {
  const router = useRouter();

  // Priority:
  // 1) ?lang=he|en|ru
  // 2) localStorage "laplapla_lang"
  // 3) browser / default
  const lang = (Array.isArray(router.query.lang)
    ? router.query.lang[0]
    : router.query.lang) as keyof typeof dictionaries || "ru";

  const t = useMemo(() => dictionaries[lang]?.cats ?? dictionaries.ru.cats, [lang]);

  // Optional: RTL support (local to page)
  const dir = lang === "he" ? "rtl" : "ltr";

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
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cat-page-container" dir={dir}>
      <h1 className="cat-page-title page-title">{t.title}</h1>
      <p className="cat-page-subtitle page-subtitle">{t.subtitle}</p>
      <p className="example-title">{t.examplesTitle}</p>
      <div className="example-buttons">
        <button className="example-button" onClick={() => setInputText(t.examples.engine)}>
          {t.examples.engine}
        </button>
        <button className="example-button" onClick={() => setInputText(t.examples.passionarity)}>
          {t.examples.passionarity}
        </button>
        <button className="example-button" onClick={() => setInputText(t.examples.dreams)}>
          {t.examples.dreams}
        </button>
      </div>
      <div className="input-wrapper search-input-wrapper">
        <input
          className="question-input search-input"
          type="text"
          placeholder={t.inputPlaceholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          className="ask-button search-button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? t.thinkingShort : t.askButton}
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="slide-container">
        {loading ? (
  <div className="cat-spinner-wrapper">
    <img src="/spinners/CatSpinner.svg" alt="Котик думает..." width={64} height={64} />
    <p className="cat-spinner-text">{t.thinkingLong}</p>
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
          setError(t.errors.generic);
        } finally {
          setLoading(false);
        }
      }}>
        {t.randomQuestion}
      </button>
      <img src="/cat/mouse-hanging.webp" className="hanging-mouse" />
      
      <footer className="giphy-footer">
        <img src="/cat/ball.webp" alt="Клубочек" className="rolling-ball" />
        <p className="giphy-attribution-text">{t.attribution.gifsPoweredBy}</p>
        <img src="/giphy-logo.webp" alt="GIPHY Logo" className="giphy-logo" />
        <p className="pexels-credit">
  {t.attribution.videoProvidedBy} <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>.
</p>
      </footer>
    </div>
  );
}