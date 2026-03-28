import * as React from "react";

type Props = {
  lang: "ru" | "en" | "he";
  styleSlug: string;
  title: string;
  description: string;
  searchArtist: string;
  searchGenre: string;
  slides: Slide[];
  ui: {
    externalPrompt: string;
    aboutArtist: string;
    aboutStyle: string;
  };
};

export type Slide = {
  text: string;
  mediaUrl?: string;
};

const openGoogle = (q: string) =>
  window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");

const clientMediaCache = new Map<string, { mediaUrl: string | null; timestamp: number }>();
const CLIENT_TTL_MS = 60 * 60 * 1000;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into",
  "это", "как", "что", "для", "или", "его", "она", "они", "про",
  "עם", "של", "זה", "את", "על", "גם", "אבל", "כמו",
]);

const extractKeywords = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 4)
    .join(" ");
};

async function fetchMedia(styleSlug: string, slide: Slide, index: number): Promise<string | null> {
  if (slide.mediaUrl) {
    return slide.mediaUrl;
  }

  const query = `${styleSlug} ${extractKeywords(slide.text)}`.trim();
  const cacheKey = `${styleSlug}:${query}:${index % 2 === 0 ? "giphy" : "pexels"}`;
  const cached = clientMediaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CLIENT_TTL_MS) {
    return cached.mediaUrl;
  }

  const preferredEndpoint = index % 2 === 0 ? "/api/giphy" : "/api/pexels";
  const fallbackEndpoint = index % 2 === 0 ? "/api/pexels" : "/api/giphy";

  const loadFrom = async (endpoint: string) => {
    const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&limit=5`);
    if (!response.ok) return null;
    const json = await response.json();
    return json?.items?.[0]?.url ?? null;
  };

  const mediaUrl = (await loadFrom(preferredEndpoint)) ?? (await loadFrom(fallbackEndpoint));
  clientMediaCache.set(cacheKey, { mediaUrl, timestamp: Date.now() });
  return mediaUrl;
}

const ParrotSlider = ({ slides = [] }: { slides?: Slide[] }) => {
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const sliderRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      const scrollLeft = slider.scrollLeft;
      const slideWidth = slider.offsetWidth * 0.9 + 16;
      const index = Math.round(scrollLeft / slideWidth);
      setCurrentIndex(index);
    };

    slider.addEventListener("scroll", handleScroll);
    return () => slider.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    setCurrentIndex(0);
    sliderRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [slides]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    const slider = sliderRef.current;
    if (!slider) return;
    const slideWidth = slider.offsetWidth * 0.9 + 16;
    slider.scrollTo({ left: slideWidth * index, behavior: "smooth" });
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
              {slide.mediaUrl ? (
                slide.mediaUrl.endsWith(".mp4") || slide.mediaUrl.endsWith(".webm") ? (
                <video
                  src={slide.mediaUrl}
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
                  src={slide.mediaUrl}
                  alt={slide.text}
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain"
                  }}
                />
                )
              ) : (
                <div
                  style={{
                    width: "100%",
                    minHeight: "220px",
                    maxHeight: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "28px",
                    background: "linear-gradient(135deg, #fff3b0, #ffd6e7 55%, #d9f7ff)",
                    padding: "1.5rem",
                    boxSizing: "border-box",
                    fontFamily: "'Amatic SC', cursive",
                    fontSize: "42px",
                    color: "#3a2a2a"
                  }}
                >
                  🦜
                </div>
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
          onClick={() => sliderRef.current?.scrollBy({ left: -500, behavior: "smooth" })}
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
          onClick={() => sliderRef.current?.scrollBy({ left: 500, behavior: "smooth" })}
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

export default function ParrotStoryCard({
  lang,
  styleSlug,
  title,
  description,
  searchArtist,
  searchGenre,
  slides,
  ui,
}: Props) {
  const [resolvedSlides, setResolvedSlides] = React.useState<Slide[]>(slides);

  React.useEffect(() => {
    let cancelled = false;
    setResolvedSlides(slides);

    void (async () => {
      const nextSlides = await Promise.all(
        slides.map(async (slide, index) => ({
          ...slide,
          mediaUrl: slide.mediaUrl ?? (await fetchMedia(styleSlug, slide, index)) ?? undefined,
        })),
      );

      if (!cancelled) {
        setResolvedSlides(nextSlides);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang, slides, styleSlug]);

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
          {(resolvedSlides?.length ?? 0) > 0 && (
            <ParrotSlider slides={resolvedSlides} />
          )}
        </div>
        <div className="parrot-button-container">
          <h4 style={{ fontFamily: "'Amatic SC', cursive", fontSize: "22px", marginBottom: "0.5rem", textAlign: "center" }}>
            {ui.externalPrompt}
          </h4>
          <button
            onClick={() => openGoogle(searchArtist + " site:youtube.com")}
            className="external-link-button artist"
          >
            {ui.aboutArtist}
          </button>
          <button
            onClick={() => openGoogle(searchGenre)}
            className="external-link-button genre"
          >
            {ui.aboutStyle}
          </button>
        </div>
      </div>
      <style jsx>{`
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
