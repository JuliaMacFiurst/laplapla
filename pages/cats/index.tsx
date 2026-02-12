import { useState, useMemo, useEffect } from "react";
import { dictionaries, Lang } from "../../i18n";
import { CAT_PRESETS, CAT_TEXT_PRESETS } from "../../content/cats";
import CatsLayout from "@/components/Cats/CatsLayout";
import { useRouter } from "next/router";

export default function CatPage({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].cats;

  const PRESETS_ONLY = true;

  const presetsForLang = useMemo(
    () => CAT_PRESETS.filter((p) => p.lang === lang),
    [lang]
  );

  const textPresetsForLang = useMemo(
    () => CAT_TEXT_PRESETS.filter((p) => p.lang === lang),
    [lang]
  );

  const findPresetByKey = (key: string) =>
    presetsForLang.find((p) => p.id.startsWith(key));

  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [slides, setSlides] = useState<{ text: string; image?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePreset = useMemo(() => {
    if (!activePresetKey) return null;
    return (
      presetsForLang.find((p) =>
        p.id.startsWith(activePresetKey)
      ) || null
    );
  }, [activePresetKey, presetsForLang]);

  useEffect(() => {
    if (!activePreset) return;

    setInputText(activePreset.prompt);
    setSlides(
      activePreset.slides.map((s) => ({
        text: s.text,
        image: s.mediaUrl,
      }))
    );
  }, [activePreset]);

  const applyPreset = (preset: typeof presetsForLang[number]) => {
    const key = preset.id.split("-")[0];
    setActivePresetKey(key);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSlides([]);

    try {
      const response = await fetch("/api/cat-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputText, lang }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при запросе к серверу");
      }

      const data = await response.json();
      setSlides(data.slides);
    } catch {
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  return (
    <CatsLayout active="view" lang={lang}>

      <p className="example-title">{t.examplesTitle}</p>

      <div className="example-buttons">
        <button
          className="example-button"
          onClick={() => {
            const preset = findPresetByKey("engine");
            if (preset) applyPreset(preset);
          }}
        >
          {t.examples.engine}
        </button>

        <button
          className="example-button"
          onClick={() => {
            const preset = findPresetByKey("passionarity");
            if (preset) applyPreset(preset);
          }}
        >
          {t.examples.passionarity}
        </button>

        <button
          className="example-button"
          onClick={() => {
            const preset = findPresetByKey("dreams");
            if (preset) applyPreset(preset);
          }}
        >
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
          onClick={() => {
            if (PRESETS_ONLY) {
              setError(t.errors.catsAiNotAvailable);
              return;
            }
            handleGenerate();
          }}
          disabled={loading}
        >
          {loading ? t.thinkingShort : t.askButton}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <button
        className="random-question-button random-book-button"
        onClick={async () => {
          setError(null);
          setSlides([]);

          const allPresets = [
            ...presetsForLang.map((p) => ({ type: "full" as const, preset: p })),
            ...textPresetsForLang.map((p) => ({ type: "text" as const, preset: p })),
          ];

          if (!allPresets.length) return;

          const randomItem =
            allPresets[Math.floor(Math.random() * allPresets.length)];

          if (randomItem.type === "full") {
            applyPreset(randomItem.preset);
            return;
          }

          setLoading(true);
          try {
            const response = await fetch("/api/cat-slides", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: randomItem.preset.prompt,
                lang,
              }),
            });

            if (!response.ok) throw new Error("Failed to fetch slides");

            const data = await response.json();
            setInputText(randomItem.preset.prompt);
            setSlides(data.slides);
          } catch {
            setError(t.errors.generic);
          } finally {
            setLoading(false);
          }
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {slides.length > 0 && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            className="edit-slides-button"
            onClick={() => {
  sessionStorage.setItem("catsSlides", JSON.stringify(slides));
  router.push("/cats/studio");
}}
          >
            Редактировать в студии
          </button>
        </div>
      )}

      <img src="/cat/mouse-hanging.webp" className="hanging-mouse" />

      <footer className="giphy-footer">
        <img src="/cat/ball.webp" alt="Клубочек" className="rolling-ball" />
        <p className="giphy-attribution-text">{t.attribution.gifsPoweredBy}</p>
        <img src="/giphy-logo.webp" alt="GIPHY Logo" className="giphy-logo" />
        <p className="pexels-credit">
          {t.attribution.videoProvidedBy}{" "}
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">
            Pexels
          </a>
          .
        </p>
      </footer>
    </CatsLayout>
  );
}