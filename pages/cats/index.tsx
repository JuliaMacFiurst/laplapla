import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import { useRouter } from "next/router";
import CorePageLinks from "@/components/CorePageLinks";
import MultiSelectFilterPanel from "@/components/MultiSelectFilterPanel";
import SEO from "@/components/SEO";
import TranslationWarning from "@/components/TranslationWarning";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import { useMobileSlideshow } from "@/components/studio/mobile/useMobileSlideshow";
import CatsLayout from "@/components/Cats/CatsLayout";
import { useIsMobile } from "@/hooks/useIsMobile";
import { dictionaries, Lang } from "../../i18n";
import { CAT_PRESETS, type AnyCatPreset } from "../../content/cats";
import {
  buildAnimalSlideMediaQueries,
  findAlternativeSlideMedia,
} from "@/lib/client/slideMediaSearch";
import { DEFAULT_LANG, getCurrentLang, isLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";
import type { StudioSlide } from "@/types/studio";
import { resolveCatCategory } from "@/lib/catCategories";

type CatRuntimeSlide = {
  text: string;
  image?: string;
};

const CAT_SEARCH_RESULTS_LIMIT = 8;
const visuallyHiddenStyle = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
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

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesCatPresetQuery(preset: AnyCatPreset, query: string) {
  const normalizedPrompt = normalizeForSearch(preset.prompt);
  if (!normalizedPrompt) {
    return false;
  }

  if (normalizedPrompt.includes(query)) {
    return true;
  }

  const queryTokens = query.split(" ").filter(Boolean);
  const promptTokens = normalizedPrompt.split(" ").filter(Boolean);

  return queryTokens.every((queryToken) =>
    promptTokens.some((promptToken) =>
      promptToken.startsWith(queryToken) ||
      queryToken.startsWith(promptToken) ||
      promptToken.includes(queryToken),
    ),
  );
}

export default function CatPage({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].cats;
  const seo = dictionaries[lang].seo.cats.index;
  const isMobile = useIsMobile();
  const mobileSlideshow = useMobileSlideshow();
  const mobileSlideshowIsOpen = mobileSlideshow.isOpen;
  const mobileSlideshowSlides = mobileSlideshow.slides;
  const mobileSlideshowCurrentSlideIndex = mobileSlideshow.currentSlideIndex;
  const mobileSlideshowLoading = mobileSlideshow.loading;
  const mobileSlideshowShowSwipeHint = mobileSlideshow.showSwipeHint;
  const mobileSlideshowOpen = mobileSlideshow.open;
  const mobileSlideshowClose = mobileSlideshow.close;
  const mobileSlideshowReplaceSlides = mobileSlideshow.replaceSlides;
  const mobileSlideshowUpdateSlides = mobileSlideshow.updateSlides;
  const mobileSlideshowGoToSlide = mobileSlideshow.goToSlide;
  const mobileSlideshowSetLoading = mobileSlideshow.setLoading;
  const mobileSlideshowMarkInteracted = mobileSlideshow.markInteracted;
  const router = useRouter();
  const currentLang = getCurrentLang(router);
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/cats";

  const [availablePresets, setAvailablePresets] = useState<AnyCatPreset[]>(CAT_PRESETS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [slides, setSlides] = useState<CatRuntimeSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingSlideIndex, setRefreshingSlideIndex] = useState<number | null>(null);
  const [examplePresets, setExamplePresets] = useState<AnyCatPreset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isDesktopSearchFocused, setIsDesktopSearchFocused] = useState(false);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
  const lastResolvedTextPresetKeyRef = useRef<string | null>(null);

  const presetsForLang = useMemo(
    () => availablePresets.filter((preset) => preset.lang === lang),
    [availablePresets, lang],
  );

  const availableCategories = useMemo(
    () =>
      Array.from(
        presetsForLang.reduce((categories, preset) => {
          const resolvedCategory = resolveCatCategory(preset);
          if (!resolvedCategory || categories.has(resolvedCategory.key)) {
            return categories;
          }

          categories.set(resolvedCategory.key, resolvedCategory.label);
          return categories;
        }, new Map<string, string>()),
      )
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label, lang, { sensitivity: "base" })),
    [lang, presetsForLang],
  );

  const filteredPresetsForLang = useMemo(() => {
    if (selectedCategories.length === 0) {
      return presetsForLang;
    }

    return presetsForLang.filter((preset) => {
      const category = resolveCatCategory(preset);
      return category ? selectedCategories.includes(category.key) : false;
    });
  }, [presetsForLang, selectedCategories]);

  const activePreset = useMemo(() => {
    if (!activePresetId) return null;
    return presetsForLang.find((preset) => preset.id === activePresetId) || null;
  }, [activePresetId, presetsForLang]);

  useEffect(() => {
    if (!activePresetId || activePreset) {
      return;
    }

    setInputText("");
    setPendingQuestion("");
    setSlides([]);
    setLoading(false);
  }, [activePreset, activePresetId]);

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
              ),
            )
          : [];

        if (active && nextPresets.length > 0) {
          setAvailablePresets(nextPresets);
        }
      } catch (nextError) {
        console.warn("[cats] failed to load DB cat presets; using hardcoded presets", nextError);
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
    setExamplePresets(pickRandomItems(filteredPresetsForLang, 3));
  }, [filteredPresetsForLang]);

  useEffect(() => {
    setSelectedCategories((current) =>
      current.filter((category) => availableCategories.some((option) => option.value === category)),
    );
  }, [availableCategories]);

  const getSlidesForPreset = useCallback(async (
    preset: AnyCatPreset,
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

    const data = await response.json() as { slides?: CatRuntimeSlide[] };
    return {
      prompt: preset.prompt,
      slides: Array.isArray(data.slides) ? data.slides : [],
      seed: preset.id,
    };
  }, [lang]);

  useEffect(() => {
    if (!activePreset) {
      return;
    }

    if (activePreset.kind === "full") {
      lastResolvedTextPresetKeyRef.current = null;
      setError(null);
      setLoading(false);
      setPendingQuestion("");
      setInputText(activePreset.prompt);
      setSlides(
        activePreset.slides.map((slide) => ({
          text: slide.text,
          image: slide.mediaUrl,
        })),
      );
      return;
    }

    const presetCacheKey = `${lang}:${activePreset.id}`;
    if (lastResolvedTextPresetKeyRef.current === presetCacheKey) {
      return;
    }

    let active = true;
    setError(null);
    setSlides([]);
    setLoading(true);
    setPendingQuestion(activePreset.prompt);

    void getSlidesForPreset(activePreset)
      .then((next) => {
        if (!active) {
          return;
        }

        lastResolvedTextPresetKeyRef.current = presetCacheKey;
        setInputText(next.prompt);
        setSlides(next.slides);

        if (mobileSlideshowIsOpen) {
          mobileSlideshowReplaceSlides(buildStudioSlides(next.slides, next.seed));
        }
      })
      .catch(() => {
        if (active) {
          setError(t.errors.generic);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setPendingQuestion("");
        }
      });

    return () => {
      active = false;
    };
  }, [activePreset, getSlidesForPreset, lang, mobileSlideshowIsOpen, mobileSlideshowReplaceSlides, t.errors.generic]);

  const currentLoadingQuestion = (pendingQuestion || inputText).trim();
  const mobileLoadingLabel = currentLoadingQuestion
    ? t.thinkingLongWithQuestion.replace("{question}", currentLoadingQuestion)
    : t.thinkingLong;

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = useMemo(
    () => normalizeForSearch(deferredSearchQuery),
    [deferredSearchQuery],
  );

  const searchResults = useMemo(() => {
    if (normalizedSearchQuery.length < 2) {
      return [] as AnyCatPreset[];
    }

    return filteredPresetsForLang
      .filter((preset) => matchesCatPresetQuery(preset, normalizedSearchQuery))
      .slice(0, CAT_SEARCH_RESULTS_LIMIT);
  }, [filteredPresetsForLang, normalizedSearchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setIsDesktopSearchFocused(false);
    setIsMobileSearchFocused(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const clearCategories = () => {
    setSelectedCategories([]);
  };

  const selectPresetFromSearch = (preset: AnyCatPreset) => {
    clearSearch();

    if (isMobile) {
      void openMobilePreset(preset);
      return;
    }

    applyPreset(preset);
  };

  const applyPreset = (preset: AnyCatPreset) => {
    lastResolvedTextPresetKeyRef.current = preset.kind === "text" ? null : lastResolvedTextPresetKeyRef.current;
    setActivePresetId(preset.id);
    if (preset.kind === "full") {
      setError(null);
    }
  };

  const openMobilePreset = async (preset: AnyCatPreset) => {
    lastResolvedTextPresetKeyRef.current = preset.kind === "text" ? `${lang}:${preset.id}` : null;
    setActivePresetId(preset.id);
    setError(null);
    setPendingQuestion(preset.prompt);
    mobileSlideshowOpen({ loading: true });

    try {
      const next = await getSlidesForPreset(preset);
      const viewerSlides = buildStudioSlides(next.slides, next.seed);

      setInputText(next.prompt);
      setSlides(next.slides);
      mobileSlideshowReplaceSlides(viewerSlides);
    } catch {
      setError(t.errors.generic);
      mobileSlideshowClose();
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
            : currentSlide,
        ),
      );
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  };

  const handleMobileFindNewImage = async (slideIndex: number) => {
    const slide = mobileSlideshowSlides[slideIndex];
    if (!slide?.mediaUrl) {
      return;
    }

    setRefreshingSlideIndex(slideIndex);

    try {
      const nextImage = await findAlternativeImage(slide.text, slide.mediaUrl);
      if (!nextImage) {
        return;
      }

      mobileSlideshowUpdateSlides(
        mobileSlideshowSlides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                mediaUrl: nextImage,
                mediaType: nextImage.endsWith(".mp4") ? "video" : "image",
              }
            : currentSlide,
        ),
      );

      setSlides((currentSlides) =>
        currentSlides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                image: nextImage,
              }
            : currentSlide,
        ),
      );
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  };

  const openRandomMobileSlideshow = async () => {
    if (!filteredPresetsForLang.length) {
      return;
    }

    const randomPreset = filteredPresetsForLang[Math.floor(Math.random() * filteredPresetsForLang.length)];
    lastResolvedTextPresetKeyRef.current = randomPreset.kind === "text" ? `${lang}:${randomPreset.id}` : null;
    setActivePresetId(randomPreset.id);
    setPendingQuestion(randomPreset.prompt);
    mobileSlideshowOpen({ loading: true });

    try {
      const next = await getSlidesForPreset(randomPreset);
      setInputText(next.prompt);
      setSlides(next.slides);
      mobileSlideshowReplaceSlides(buildStudioSlides(next.slides, next.seed));
    } catch {
      setError(t.errors.generic);
      mobileSlideshowSetLoading(false);
    } finally {
      setPendingQuestion("");
    }
  };

  const handleEditInStudio = (sourceSlides: CatRuntimeSlide[]) => {
    sessionStorage.setItem("catsSlides", JSON.stringify(sourceSlides));
    void router.push(
      buildStudioRoute("cats", currentLang),
      undefined,
      { locale: currentLang },
    );
  };

  const renderSearchBlock = (mode: "desktop" | "mobile") => {
    const isFocused = mode === "desktop" ? isDesktopSearchFocused : isMobileSearchFocused;
    const setFocused = mode === "desktop" ? setIsDesktopSearchFocused : setIsMobileSearchFocused;

    return (
      <div className={`cats-search-block cats-search-block-${mode}`}>
        <form
          className={`search-form cats-search-form ${
            mode === "mobile" ? "cats-search-form-mobile" : "cats-search-form-desktop"
          }`}
          onSubmit={(event) => {
            event.preventDefault();
            if (searchResults[0]) {
              selectPresetFromSearch(searchResults[0]);
            }
          }}
        >
          <div className="search-input-wrapper">
            <input
              type="text"
              id={`cats-search-${mode}`}
              name="cats-search"
              className="search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  setFocused(false);
                }, 120);
              }}
              placeholder={t.examplesTitle}
              aria-label={t.examplesTitle}
            />
            {searchQuery ? (
              <button
                type="button"
                className="search-clear-button"
                onMouseDown={(event) => event.preventDefault()}
              onClick={clearSearch}
              aria-label="Clear"
              >
                ×
              </button>
            ) : null}
            {mode === "mobile" ? (
              <button
                type="submit"
                className="search-button cats-search-submit"
                aria-label={t.inputPlaceholder}
                disabled={!searchResults[0]}
              >
                <span aria-hidden="true">⌕</span>
              </button>
            ) : null}
          </div>
        </form>

        <MultiSelectFilterPanel
          title={t.categoriesTitle}
          clearLabel={t.clearCategories}
          onClear={clearCategories}
          className={`cats-category-panel cats-category-panel-${mode}`}
          groups={[
            {
              id: "cats-categories",
              label: t.categoriesTitle,
              options: availableCategories,
              selectedValues: selectedCategories,
              onToggle: toggleCategory,
            },
          ]}
        />

        {isFocused && searchResults.length > 0 ? (
          <div className="cats-search-results search-results-panel">
            <div className="search-results-list">
              {searchResults.map((preset) => (
                <button
                  key={`${preset.kind}:${preset.id}`}
                  type="button"
                  className="search-result-card"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectPresetFromSearch(preset)}
                >
                  {preset.prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const mobileTriggerButtons = (
    <div className="cats-mobile-entry">
      {error ? <p className="error-message">{error}</p> : null}
      {renderSearchBlock("mobile")}
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
            <p style={visuallyHiddenStyle}>
              {seo.description}
            </p>
            <CorePageLinks current="cats" lang={lang} related={["book", "parrots", "raccoons"]} />
            {renderSearchBlock("desktop")}

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
                if (!filteredPresetsForLang.length) return;

                const randomPreset =
                  filteredPresetsForLang[Math.floor(Math.random() * filteredPresetsForLang.length)];

                applyPreset(randomPreset);
              }}
            >
              {t.randomQuestion}
            </button>

            <div className="slide-container">
              {lang !== "ru" && activePreset?.translated === false ? <TranslationWarning lang={lang} /> : null}
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

            {slides.length > 0 ? (
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
            ) : null}

            <img src="/cat/mouse-hanging.webp" alt="" className="hanging-mouse" />
            <img src="/cat/ball.webp" alt="" className="rolling-ball" />
          </>
        )}
      </CatsLayout>

      <MobileSlideshowViewer
        isOpen={mobileSlideshowIsOpen}
        slides={mobileSlideshowSlides}
        currentSlideIndex={mobileSlideshowCurrentSlideIndex}
        loading={mobileSlideshowLoading}
        showSwipeHint={mobileSlideshowShowSwipeHint}
        lang={lang}
        loadingLabel={mobileLoadingLabel}
        swipeHintLabel={t.swipeHint}
        randomQuestionLabel={t.randomQuestion}
        findNewImageLabel={
          refreshingSlideIndex === mobileSlideshowCurrentSlideIndex ? "..." : t.findNewImage
        }
        editInStudioLabel={t.editInStudio}
        closeLabel={t.studio.closePreview}
        onClose={mobileSlideshowClose}
        onIndexChange={mobileSlideshowGoToSlide}
        onInteract={mobileSlideshowMarkInteracted}
        onFindNewImage={handleMobileFindNewImage}
        onEditInStudio={() => {
          handleEditInStudio(
            mobileSlideshowSlides.map((slide) => ({
              text: slide.text,
              image: slide.mediaUrl,
            })),
          );
        }}
        onRandomQuestion={openRandomMobileSlideshow}
      />
    </>
  );
}

export const getStaticProps: GetStaticProps<{ lang: Lang }> = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;

  return {
    props: {
      lang,
    },
  };
};
