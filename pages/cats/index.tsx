import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import { useMobileSlideshow } from "@/components/studio/mobile/useMobileSlideshow";
import CatsLayout from "@/components/Cats/CatsLayout";
import { useIsMobile } from "@/hooks/useIsMobile";
import { dictionaries, Lang } from "../../i18n";
import { CAT_PRESETS, type AnyCatPreset } from "../../content/cats";
import { useRouter } from "next/router";
import {
  buildAnimalSlideMediaQueries,
  findAlternativeSlideMedia,
} from "@/lib/client/slideMediaSearch";
import { getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";
import type { StudioSlide } from "@/types/studio";

type CatRuntimeSlide = {
  text: string;
  image?: string;
};

function pickRandomItems<T>(items: T[], count: number) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

function buildStudioSlides(slides: CatRuntimeSlide[], seed: string): StudioSlide[] {
  return slides
    .filter((slide) => slide.text && slide.image)
    .map((slide, index) => ({
      id: `${seed}-${index}`,
      text: slide.text,
      mediaUrl: slide.image,
      mediaType: slide.image?.endsWith(".mp4") ? "video" : "image",
      mediaFit: "contain",
      bgColor: "#ffffff",
      textColor: "#111111",
    }));
}

export default function CatPage({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].cats;
  const seo = dictionaries[lang].seo.cats.index;
  const isMobile = useIsMobile();
  const mobileSlideshow = useMobileSlideshow();

  const [availablePresets, setAvailablePresets] = useState<AnyCatPreset[]>(CAT_PRESETS);

  const presetsForLang = useMemo(
    () => availablePresets.filter((preset) => preset.lang === lang),
    [availablePresets, lang]
  );

  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [slides, setSlides] = useState<CatRuntimeSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSlideIndex, setRefreshingSlideIndex] = useState<number | null>(null);
  const [examplePresets, setExamplePresets] = useState<AnyCatPreset[]>([]);

  const activePreset = useMemo(() => {
    if (!activePresetKey) return null;
    return presetsForLang.find((preset) => preset.id === activePresetKey) || null;
  }, [activePresetKey, presetsForLang]);

  useEffect(() => {
    let active = true;
    setAvailablePresets(CAT_PRESETS);

    const loadPresets = async () => {
      try {
        const response = await fetch(`/api/cat-presets?lang=${encodeURIComponent(lang)}`);
        if (!response.ok) {
          throw new Error(`Failed to load cat presets: ${response.status}`);
        }

        const data = await response.json() as { presets?: unknown };
        const nextPresets = Array.isArray(data.presets)
          ? data.presets.filter((preset): preset is AnyCatPreset =>
              Boolean(
                preset &&
                typeof preset === "object" &&
                "id" in preset &&
                "kind" in preset &&
                "prompt" in preset,
              )
            )
          : [];

        if (active && nextPresets.length > 0) {
          setAvailablePresets(nextPresets);
        }
      } catch (error) {
        console.warn("[cats] failed to load DB cat presets; using hardcoded presets", error);
        if (active) {
          setAvailablePresets(CAT_PRESETS);
        }
      }
    };

    void loadPresets();

    return () => {
      active = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!activePreset || activePreset.kind !== "full") return;

    setInputText(activePreset.prompt);
    setSlides(
      activePreset.slides.map((slide) => ({
        text: slide.text,
        image: slide.mediaUrl,
      }))
    );
  }, [activePreset]);

  useEffect(() => {
    setExamplePresets(pickRandomItems(presetsForLang, 3));
  }, [presetsForLang]);

  const router = useRouter();
  const currentLang = getCurrentLang(router);
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/cats";
  const currentLoadingQuestion = (pendingQuestion || inputText).trim();
  const mobileLoadingLabel = currentLoadingQuestion
    ? t.thinkingLongWithQuestion.replace("{question}", currentLoadingQuestion)
    : t.thinkingLong;

  const getSlidesForPreset = async (
    preset: AnyCatPreset
  ): Promise<{ prompt: string; slides: CatRuntimeSlide[]; seed: string }> => {
    if (preset.kind === "full") {
      return {
        prompt: preset.prompt,
        slides: preset.slides.map((slide) => ({
          text: slide.text,
          image: slide.mediaUrl,
        })),
        seed: preset.id,
      };
    }

    const response = await fetch("/api/cat-slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        presetId: preset.id,
        prompt: preset.prompt,
        lang,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch slides");
    }

    const data = await response.json();
    return {
      prompt: preset.prompt,
      slides: data.slides,
      seed: preset.id,
    };
  };

  const applyPreset = (preset: AnyCatPreset) => {
    if (preset.kind === "text") {
      void handleTextPreset(preset);
      return;
    }

    setActivePresetKey(preset.id);
  };

  const handleTextPreset = async (
    preset: Extract<AnyCatPreset, { kind: "text" }>
  ) => {
    setError(null);
    setSlides([]);
    setLoading(true);
    setPendingQuestion(preset.prompt);

    try {
      const next = await getSlidesForPreset(preset);
      setInputText(next.prompt);
      setSlides(next.slides);
    } catch {
      setError(t.errors.generic);
    } finally {
      setLoading(false);
      setPendingQuestion("");
    }
  };

  const openMobilePreset = async (preset: AnyCatPreset) => {
    setError(null);
    setPendingQuestion(preset.prompt);
    mobileSlideshow.open({ loading: true });

    try {
      const next = await getSlidesForPreset(preset);
      const viewerSlides = buildStudioSlides(next.slides, next.seed);

      setInputText(next.prompt);
      setSlides(next.slides);
      mobileSlideshow.replaceSlides(viewerSlides);
    } catch {
      setError(t.errors.generic);
      mobileSlideshow.close();
    } finally {
      setPendingQuestion("");
    }
  };

  const findAlternativeImage = async (slideText: string, currentImage?: string) => {
    const alternative = await findAlternativeSlideMedia({
      queries: buildAnimalSlideMediaQueries(["cat", "kitten", "kitty"], inputText, slideText),
      excludedUrls: currentImage ? [currentImage] : [],
      preferredSources: ["giphy", "pexels"],
    });

    return alternative?.url ?? null;
  };

  const handleFindNewImage = async (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide) {
      return;
    }

    setRefreshingSlideIndex(slideIndex);

    try {
      const nextImage = await findAlternativeImage(slide.text, slide.image);
      if (!nextImage) {
        return;
      }

      setSlides((currentSlides) =>
        currentSlides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                image: nextImage,
              }
            : currentSlide
        )
      );
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  };

  const handleMobileFindNewImage = async (slideIndex: number) => {
    const slide = mobileSlideshow.slides[slideIndex];
    if (!slide?.mediaUrl) {
      return;
    }

    setRefreshingSlideIndex(slideIndex);

    try {
      const nextImage = await findAlternativeImage(slide.text, slide.mediaUrl);
      if (!nextImage) {
        return;
      }

      mobileSlideshow.updateSlides(
        mobileSlideshow.slides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                mediaUrl: nextImage,
                mediaType: nextImage.endsWith(".mp4") ? "video" : "image",
              }
            : currentSlide
        )
      );

      setSlides((currentSlides) =>
        currentSlides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                image: nextImage,
              }
            : currentSlide
        )
      );
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  };

  const openRandomMobileSlideshow = async () => {
    if (!presetsForLang.length) {
      return;
    }

    const randomPreset = presetsForLang[Math.floor(Math.random() * presetsForLang.length)];
    setPendingQuestion(randomPreset.prompt);
    mobileSlideshow.open({ loading: true });

    try {
      const next = await getSlidesForPreset(randomPreset);

      setInputText(next.prompt);
      setSlides(next.slides);
      mobileSlideshow.replaceSlides(buildStudioSlides(next.slides, next.seed));
    } catch {
      setError(t.errors.generic);
      mobileSlideshow.setLoading(false);
    } finally {
      setPendingQuestion("");
    }
  };

  const handleEditInStudio = (sourceSlides: CatRuntimeSlide[]) => {
    sessionStorage.setItem("catsSlides", JSON.stringify(sourceSlides));
    void router.push(
      buildStudioRoute("cats", currentLang),
      undefined,
      { locale: currentLang }
    );
  };

  const mobileTriggerButtons = (
    <div className="cats-mobile-entry">
      {error ? <p className="error-message">{error}</p> : null}
      <div className="cats-mobile-trigger-list">
        {examplePresets.map((item) => (
          <button
            key={`${item.kind}:${item.id}`}
            type="button"
            className="example-button cats-mobile-trigger"
            onClick={() => {
              void openMobilePreset(item);
            }}
          >
            <span className="cats-mobile-trigger-label">{item.prompt}</span>
          </button>
        ))}
      </div>
      <div className="cats-mobile-slideshow-intro">
        <span className="cats-mobile-slideshow-intro-title">{t.mobileIntroTitle}</span>
        <span className="cats-mobile-slideshow-intro-text">{t.mobileIntroText}</span>
      </div>
      <div className="cats-mobile-random-button-wrapper">
        <button
          type="button"
          className="random-question-button random-book-button cats-mobile-random-button"
          onClick={() => {
            void openRandomMobileSlideshow();
          }}
        >
          {t.randomQuestion}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <CatsLayout active="view" lang={lang}>
        {isMobile ? (
          mobileTriggerButtons
        ) : (
          <>
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

            {error && <p className="error-message">{error}</p>}

            <button
              className="random-question-button random-book-button"
              onClick={() => {
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
                            alt={slide.text || "illustration"}
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

            {slides.length > 0 && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button
                  className="edit-slides-button"
                  onClick={() => {
                    handleEditInStudio(slides);
                  }}
                >
                  {t.editInStudio}
                </button>
              </div>
            )}

            <img src="/cat/mouse-hanging.webp" alt="" className="hanging-mouse" />
            <img src="/cat/ball.webp" alt="" className="rolling-ball" />
          </>
        )}
      </CatsLayout>

      <MobileSlideshowViewer
        isOpen={mobileSlideshow.isOpen}
        slides={mobileSlideshow.slides}
        currentSlideIndex={mobileSlideshow.currentSlideIndex}
        loading={mobileSlideshow.loading}
        showSwipeHint={mobileSlideshow.showSwipeHint}
        lang={lang}
        loadingLabel={mobileLoadingLabel}
        swipeHintLabel={t.swipeHint}
        randomQuestionLabel={t.randomQuestion}
        findNewImageLabel={
          refreshingSlideIndex === mobileSlideshow.currentSlideIndex ? "..." : t.findNewImage
        }
        editInStudioLabel={t.editInStudio}
        closeLabel={t.studio.closePreview}
        onClose={mobileSlideshow.close}
        onIndexChange={mobileSlideshow.goToSlide}
        onInteract={mobileSlideshow.markInteracted}
        onFindNewImage={handleMobileFindNewImage}
        onEditInStudio={() => {
          handleEditInStudio(
            mobileSlideshow.slides.map((slide) => ({
              text: slide.text,
              image: slide.mediaUrl,
            }))
          );
        }}
        onRandomQuestion={openRandomMobileSlideshow}
      />
    </>
  );
}
