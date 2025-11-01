import { useState, useEffect, useRef } from "react";


type Props = {
  id: string;
  title: string;
  description: string;
  searchArtist: string;
  searchGenre: string;
};

export type Slide = {
  text: string;
  image: string;
};



const openGoogle = (q: string) =>
  window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");

const ParrotSlider = ({ slides = [] }: { slides?: { text: string; image: string }[] }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      const scrollLeft = slider.scrollLeft;
      const slideWidth = slider.offsetWidth * 0.9 + 16; // 90% ширины + gap
      const index = Math.round(scrollLeft / slideWidth);
      setCurrentIndex(index);
    };

    slider.addEventListener("scroll", handleScroll);
    return () => slider.removeEventListener("scroll", handleScroll);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <>
      <div
        ref={sliderRef}
        className="slider"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          gap: "16px",
          padding: "1rem 2rem",
          scrollPadding: "0 2rem",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            width: "5%",
            scrollSnapAlign: "start"
          }}
        />
        {slides?.map((slide, index) => (
          <div
            key={index}
            className={`slide${index === currentIndex ? " active" : ""}`}
            style={{
              flex: "0 0 auto",
              width: "90%",
              scrollSnapAlign: "center",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div
              style={{
                width: "100%",
                maxHeight: "300px",
                display: "flex",
                justifyContent: "center"
              }}
            >
              {slide.image.endsWith(".mp4") || slide.image.endsWith(".webm") ? (
                <video
                  src={slide.image}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain"
                  }}
                />
              ) : (
                <img
                  src={slide.image}
                  alt={slide.text}
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain"
                  }}
                />
              )}
            </div>
            <div
              className="text-overlay"
              style={{
                marginTop: "0.5rem",
                fontSize: "26px",
                lineHeight: "1.4",
                minHeight: "60px",
                padding: "0 1rem",
                boxSizing: "border-box",
                width: "400px"
              }}
            >
              {slide.text}
            </div>
          </div>
        ))}
        <div
          style={{
            flex: "0 0 auto",
            width: "5%",
            scrollSnapAlign: "end"
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", maxWidth: "1000px", margin: "0 auto", marginTop: "-1rem" }}>
        <button
          onClick={() => document.querySelector(".slider")?.scrollBy({ left: -500, behavior: "smooth" })}
          disabled={currentIndex === 0}
          style={{
            fontFamily: "'Amatic SC', cursive",
            fontSize: "48px",
            color: currentIndex === 0 ? "#ccc" : "#333",
            background: "transparent",
            border: "none",
            cursor: currentIndex === 0 ? "default" : "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => {
            if (currentIndex > 0) e.currentTarget.style.color = "#666";
          }}
          onMouseOut={(e) => {
            if (currentIndex > 0) e.currentTarget.style.color = "#333";
          }}
        >
          ‹
        </button>
        <button
          onClick={() => document.querySelector(".slider")?.scrollBy({ left: 500, behavior: "smooth" })}
          disabled={currentIndex === slides.length - 1}
          style={{
            fontFamily: "'Amatic SC', cursive",
            fontSize: "48px",
            color: currentIndex === slides.length - 1 ? "#ccc" : "#333",
            background: "transparent",
            border: "none",
            cursor: currentIndex === slides.length - 1 ? "default" : "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => {
            if (currentIndex < slides.length - 1) e.currentTarget.style.color = "#666";
          }}
          onMouseOut={(e) => {
            if (currentIndex < slides.length - 1) e.currentTarget.style.color = "#333";
          }}
        >
          ›
        </button>
      </div>
      <div className="nav-buttons">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot${index === currentIndex ? " active" : ""}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
};

export default function ParrotStoryCard({ id, title, description, searchArtist, searchGenre }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, Slide[]>>(new Map());

  async function loadSlides() {
    const cached = cacheRef.current.get(id);
    if (cached && cached.length >= 6) {
      setSlides(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userLang = navigator.language.startsWith('ru') ? 'ru' : 'en';
      const res = await fetch(`/api/parrot-slides?style=${encodeURIComponent(id)}&lang=${userLang}`);
      const json = await res.json();
      const newSlides = json.slides || [];
      if (newSlides.length >= 6) {
        cacheRef.current.set(id, newSlides);
      }
      setSlides(newSlides);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки слайдов");
    } finally {
      setLoading(false);
    }
  }

  const handleReload = () => {
    cacheRef.current.delete(id);
    loadSlides();
  };

  useEffect(() => {
    loadSlides();
  }, [id]);

  return (
    <div className="story-container">
      <div className="story-content" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h3 className="title" style={{ fontSize: "32px", marginBottom: "1rem" }}>
          {title}
        </h3>
        <p className="subtitle" style={{ fontSize: "20px", marginBottom: "1.5rem" }}>
          {description}
        </p>
        <div className="slider-container" style={{ position: "relative" }}>
          {loading && (
            <div
              className="loader"
              style={{
                textAlign: "center",
                fontSize: "20px",
                padding: "2rem",
                color: "#666"
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <img
                  src="/spinners/ParrotSpinner.webp"
                  alt="Загрузка"
                  style={{
                    width: "64px",
                    height: "64px",
                    animation: "spin 1s linear infinite"
                  }}
                />
              </div>
              Загружается рассказ попугайчиков о стиле «{title}»…
            </div>
          )}
          {error && <div className="error">Error: {error}</div>}
          {!loading && !error && (slides?.length ?? 0) > 0 && (
            <ParrotSlider slides={slides} />
          )}
        </div>
        <div className="parrot-button-container">
          <h4 style={{ fontFamily: "'Amatic SC', cursive", fontSize: "22px", marginBottom: "0.5rem", textAlign: "center" }}>
            Для самостоятельного серфинга по интернету нажми на эти кнопки:
          </h4>
          <button
            onClick={() => openGoogle(searchArtist + " site:youtube.com")}
            className="external-link-button artist"
          >
            🎵 Узнать про исполнителя (YouTube)
          </button>
          <button
            onClick={() => openGoogle(searchGenre)}
            className="external-link-button genre"
          >
            🔍 Узнать про стиль (Google)
          </button>
        </div>
        {!loading && !error && slides.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={handleReload}
              className="reload-button"
            >
              Загрузить рассказ заново
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        .reload-button {
          font-family: 'Amatic SC', cursive;
          font-size: 26px;
          padding: 0.5rem 1.2rem;
          border: 2px solid #ffd6e0;
          background: #fff0f5;
          border-radius: 12px;
          color: #333;
          cursor: pointer;
          transition: background 0.3s ease, transform 0.2s ease;
        }
        .reload-button:hover {
          background: #ffeaf2;
          transform: scale(1.03);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .external-link-button {
          font-family: 'Amatic SC', cursive;
          font-size: 24px;
          padding: 0.6rem 1.4rem;
          margin: 0.5rem;
          border: 2px solid #ffd2ec;
          border-radius: 14px;
          /* background-color: #fff0f8; */
          color: #444;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          width: 260px;
          justify-content: center;
        }

        .external-link-button.artist {
          background-color: #e0f7ff;
          border-color: #b3e5fc;
        }

        .external-link-button.artist:hover {
          background-color: #d0f0ff;
          box-shadow: 0 0 12px rgba(255, 182, 193, 0.6), 0 0 20px rgba(255, 240, 245, 0.8);
          transform: scale(1.06) rotate(-1deg);
        }

        .external-link-button.genre {
          background-color: #e6ffe0;
          border-color: #b2f2a4;
        }

        .external-link-button.genre:hover {
          background-color: #dbffd2;
          box-shadow: 0 0 12px rgba(255, 182, 193, 0.6), 0 0 20px rgba(255, 240, 245, 0.8);
          transform: scale(1.06) rotate(-1deg);
        }

        .external-link-button:hover {
          background-color: #ffeaf6;
          transform: scale(1.03);
          animation: wiggle 0.4s ease-in-out;
        }

        .external-link-button::after {
          content: '';
        }

        .parrot-button-container {
          background-color: #fff4fa; /* светлый персиково-розовый, можно заменить */
          padding: 1.5rem 1rem;
          border-radius: 40px;
          max-width: 360px;
          margin: 1.5rem auto 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 0 10px rgba(255, 204, 229, 0.3);
        }

        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          50% { transform: rotate(-2deg); }
          75% { transform: rotate(1deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}