import { useState, useMemo, useEffect } from "react";
import { dictionaries, Lang } from "../../i18n";
import { CAT_PRESETS } from "../../content/cats";
import CatsLayout from "@/components/Cats/CatsLayout";
import { useRouter } from "next/router";
import { buildAnimalSlideMediaQueries, findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";

function pickRandomItems<T>(items: T[], count: number) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

export default function CatPage({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].cats;

  const presetsForLang = useMemo(
    () => CAT_PRESETS.filter((preset) => preset.lang === lang),
    [lang]
  );

  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [slides, setSlides] = useState<{ text: string; image?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSlideIndex, setRefreshingSlideIndex] = useState<number | null>(null);
  const [examplePresets, setExamplePresets] = useState<typeof CAT_PRESETS>([]);

  const activePreset = useMemo(() => {
    if (!activePresetKey) return null;
    return (
      presetsForLang.find((p) =>
        p.id.startsWith(activePresetKey)
      ) || null
    );
  }, [activePresetKey, presetsForLang]);

  useEffect(() => {
    if (!activePreset || activePreset.kind !== "full") return;

    setInputText(activePreset.prompt);
    setSlides(
      activePreset.slides.map((s) => ({
        text: s.text,
        image: s.mediaUrl,
      }))
    );
  }, [activePreset]);

  useEffect(() => {
    const nextExamples = pickRandomItems(
      presetsForLang,
      3,
    );

    setExamplePresets(nextExamples);
  }, [presetsForLang]);

  const applyPreset = (preset: typeof CAT_PRESETS[number]) => {
    if (preset.kind === "text") {
      void handleTextPreset(preset);
      return;
    }

    const key = preset.id.split("-")[0];
    setActivePresetKey(key);
  };

  const handleTextPreset = async (preset: Extract<typeof CAT_PRESETS[number], { kind: "text" }>) => {
    setError(null);
    setSlides([]);
    setLoading(true);

    try {
      const response = await fetch("/api/cat-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: preset.prompt,
          lang,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch slides");

      const data = await response.json();
      setInputText(preset.prompt);
      setSlides(data.slides);
    } catch {
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  const currentLang = getCurrentLang(router);
  const isMobile = useIsMobile();

  const handleFindNewImage = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide) {
      return;
    }

    setRefreshingSlideIndex(slideIndex);
    try {
      const alternative = await findAlternativeSlideMedia({
        queries: buildAnimalSlideMediaQueries(["cat", "kitten", "kitty"], inputText, slide.text),
        excludedUrls: slide.image ? [slide.image] : [],
        preferredSources: ["giphy", "pexels"],
      });

      if (!alternative) {
        return;
      }

      setSlides((currentSlides) =>
        currentSlides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                image: alternative.url,
              }
            : currentSlide,
        ),
      );
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  };

  return (
    <CatsLayout active="view" lang={lang}>

      <p className="example-title">{t.examplesTitle}</p>

      <div className="example-buttons">
        {examplePresets.map((item) => (
          <button
            key={`${item.kind}:${item.id}`}
            className="example-button"
            onClick={() => {
              applyPreset(item);
            }}
          >
            {item.prompt}
          </button>
        ))}
      </div>

      {/* Free version: hide manual search until subscription gating is implemented. */}
      {/*
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
          onClick={() => {
            void handleGenerate();
          }}
          disabled={loading}
        >
          {loading ? t.thinkingShort : t.askButton}
        </button>
      </div>
      */}

      {error && <p className="error-message">{error}</p>}

      <button
        className="random-question-button random-book-button"
        onClick={async () => {
          if (!presetsForLang.length) return;

          const randomPreset =
            presetsForLang[Math.floor(Math.random() * presetsForLang.length)];

          applyPreset(randomPreset);
        }}
      >
        {t.randomQuestion}
      </button>

      <div className="slide-container">
        {loading ? (
          <div className="cat-spinner-wrapper">
            <img
              src="/spinners/CatSpinner.svg"
              alt="Котик думает..."
              width={64}
              height={64}
            />
            <p className="cat-spinner-text">{t.thinkingLong}</p>
          </div>
        ) : (
          <div className="slide-scroll-wrapper">
            {slides.map((slide, idx) => {
              if (!slide.text || !slide.image) return null;

              return (
                <div key={idx} className="cat-slide">
                  {slide.image.endsWith(".mp4") ? (
                    <video
                      className="cat-slide-video"
                      controls
                      autoPlay
                      muted
                      playsInline
                    >
                      <source src={slide.image} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={slide.image}
                      alt={`Slide ${idx + 1}`}
                      className="cat-slide-image"
                    />
                  )}

                  <div
                    className="cat-slide-text"
                    dangerouslySetInnerHTML={{ __html: slide.text }}
                  />
                  <div className="slideshow-refresh-button-row">
                    <button
                      type="button"
                      className="studio-button btn-mint map-popup-action-button slideshow-refresh-button"
                      disabled={refreshingSlideIndex === idx}
                      onClick={() => void handleFindNewImage(idx)}
                    >
                      {refreshingSlideIndex === idx ? "..." : t.findNewImage}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {slides.length > 0 && !isMobile && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            className="edit-slides-button"
            onClick={() => {
  sessionStorage.setItem("catsSlides", JSON.stringify(slides));
  router.push(
    { pathname: "/cats/studio", query: buildLocalizedQuery(currentLang) },
    undefined,
    { locale: currentLang },
  );
}}
          >
            {t.editInStudio}
          </button>
        </div>
      )}

      <img src="/cat/mouse-hanging.webp" className="hanging-mouse" />

     <img src="/cat/ball.webp" alt="Ball" className="rolling-ball" />
    </CatsLayout>
  );
}
