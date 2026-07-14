import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { GetStaticProps } from "next";
import Image from "next/image";
import { useRouter } from "next/router";
import CorePageLinks from "@/components/CorePageLinks";
import MultiSelectFilterPanel from "@/components/MultiSelectFilterPanel";
import SEO from "@/components/SEO";
import TranslationWarning from "@/components/TranslationWarning";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import { useMobileSlideshow } from "@/components/studio/mobile/useMobileSlideshow";
import CatsLayout from "@/components/Cats/CatsLayout";
import { useResponsiveViewport } from "@/hooks/useResponsiveViewport";
import { dictionaries, Lang } from "../../i18n";
import { CAT_PRESETS, type AnyCatPreset } from "../../content/cats";
import { findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";
import { buildShortSlideMediaQuery } from "@/lib/media/slideMedia";
import { DEFAULT_LANG, getCurrentLang, isLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";
import { trackEvent } from "@/lib/analytics/client";
import type { StudioSlide } from "@/types/studio";
import { getCatCategoryGroups, resolveCatCategory } from "@/lib/catCategories";

type CatRuntimeSlide = {
  text: string;
  image?: string;
};

const CAT_SEARCH_RESULTS_LIMIT = 8;
const CAT_EXAMPLE_PRESET_COUNT = 3;
const CAT_CATEGORY_PRESET_INCREMENT = 3;
const CAT_SUBCATEGORY_VALUE_SEPARATOR = "\u001F";
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

function isVideoMediaUrl(url?: string) {
  return /\.(mp4|webm)(?:[?#]|$)/i.test(url || "");
}

function buildStudioSlides(slides: CatRuntimeSlide[], seed: string): StudioSlide[] {
  return slides
    .filter((slide) => slide.text && slide.image)
    .map((slide, index) => ({
      id: `${seed}-${index}`,
      text: slide.text,
      mediaUrl: slide.image,
      mediaType: isVideoMediaUrl(slide.image) ? "video" : "image",
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
  const normalizedSearchText = [
    preset.prompt,
    preset.category,
    preset.categoryLabel,
    preset.categoryKey,
  ]
    .map((value) => normalizeForSearch(String(value ?? "")))
    .filter(Boolean)
    .join(" ");

  if (!normalizedSearchText) {
    return false;
  }

  if (normalizedSearchText.includes(query)) {
    return true;
  }

  const queryTokens = query.split(" ").filter(Boolean);
  const searchableTokens = normalizedSearchText.split(" ").filter(Boolean);

  return queryTokens.every((queryToken) =>
    searchableTokens.some((searchableToken) =>
      searchableToken.startsWith(queryToken) ||
      (searchableToken.length >= 4 && queryToken.startsWith(searchableToken)) ||
      searchableToken.includes(queryToken),
    ),
  );
}

function buildCatSubcategoryValue(categoryKey: string, label: string) {
  return `${categoryKey}${CAT_SUBCATEGORY_VALUE_SEPARATOR}${label}`;
}

function getCatPresetSubcategoryLabel(preset: AnyCatPreset) {
  return String(preset.categoryLabel ?? preset.category ?? "").trim();
}

export default function CatPage({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].cats;
  const seo = dictionaries[lang].seo.cats.index;
  const responsiveViewport = useResponsiveViewport();
  const usesTouchCatsLayout = responsiveViewport.deviceClass !== "desktop";
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
  const [visibleCategoryPresetCount, setVisibleCategoryPresetCount] = useState(CAT_CATEGORY_PRESET_INCREMENT);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [isDesktopSearchFocused, setIsDesktopSearchFocused] = useState(false);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
  const lastResolvedTextPresetKeyRef = useRef<string | null>(null);
  const completedQuestionKeyRef = useRef<string | null>(null);
  const trackedQuestionProgressKeyRef = useRef(new Set<string>());
  const maxTrackedSlideIndexRef = useRef(-1);
  const slideScrollWrapperRef = useRef<HTMLDivElement | null>(null);

  const presetsForLang = useMemo(
    () => availablePresets.filter((preset) => preset.lang === lang),
    [availablePresets, lang],
  );

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
    setSelectedSubcategories((current) =>
      current.filter((value) => !value.startsWith(`${category}${CAT_SUBCATEGORY_VALUE_SEPARATOR}`)),
    );
  }, []);

  const toggleSubcategory = useCallback((category: string, subcategory: string) => {
    setSelectedCategories((current) => current.includes(category) ? current : [...current, category]);
    setSelectedSubcategories((current) =>
      current.includes(subcategory)
        ? current.filter((item) => item !== subcategory)
        : [...current, subcategory],
    );
  }, []);

  const categoryOptionGroups = useMemo(() => {
    const categoryCounts = new Map<string, {
      key: string;
      label: string;
      groupKey: string;
      icon: string;
      order: number;
      count: number;
      subcategories: Map<string, number>;
    }>();

    for (const preset of presetsForLang) {
      const resolvedCategory = resolveCatCategory(preset, lang);
      if (!resolvedCategory) {
        continue;
      }

      const current = categoryCounts.get(resolvedCategory.key) ?? {
        key: resolvedCategory.key,
        label: resolvedCategory.label,
        groupKey: resolvedCategory.groupKey,
        icon: resolvedCategory.icon,
        order: resolvedCategory.order,
        count: 0,
        subcategories: new Map<string, number>(),
      };
      current.count += 1;
      const rawSubcategory = getCatPresetSubcategoryLabel(preset) || resolvedCategory.label;
      if (rawSubcategory) {
        current.subcategories.set(rawSubcategory, (current.subcategories.get(rawSubcategory) ?? 0) + 1);
      }
      categoryCounts.set(resolvedCategory.key, current);
    }

    return getCatCategoryGroups(lang)
      .map((group) => {
        const options = Array.from(categoryCounts.values())
          .filter((category) => category.groupKey === group.key && category.count > 0)
          .sort((left, right) =>
            left.order - right.order ||
            left.label.localeCompare(right.label, lang, { sensitivity: "base" }),
          )
          .map((category) => ({
            value: category.key,
            label: category.label,
            count: category.count,
            icon: category.icon,
            subcategories: Array.from(category.subcategories.entries())
              .map(([label, count]) => {
                const value = buildCatSubcategoryValue(category.key, label);
                return {
                  value,
                  label,
                  count,
                  selected: selectedSubcategories.includes(value),
                };
              })
              .sort((left, right) =>
                left.label.localeCompare(right.label, lang, { sensitivity: "base" }),
              ),
          }));

        return {
          id: `cats-categories-${group.key}`,
          label: group.label,
          options,
        };
      })
      .filter((group) => group.options.length > 0);
  }, [lang, presetsForLang, selectedSubcategories]);

  const availableCategoryGroups = useMemo(
    () =>
      categoryOptionGroups.map((group) => ({
        ...group,
        selectedValues: selectedCategories,
        onToggle: toggleCategory,
        onSubcategoryToggle: toggleSubcategory,
      })),
    [categoryOptionGroups, selectedCategories, toggleCategory, toggleSubcategory],
  );

  const filteredPresetsForLang = useMemo(() => {
    if (selectedCategories.length === 0) {
      return presetsForLang;
    }

    return presetsForLang.filter((preset) => {
      const category = resolveCatCategory(preset, lang);
      if (!category || !selectedCategories.includes(category.key)) {
        return false;
      }

      const selectedSubcategoriesForCategory = selectedSubcategories.filter((value) =>
        value.startsWith(`${category.key}${CAT_SUBCATEGORY_VALUE_SEPARATOR}`),
      );
      if (selectedSubcategoriesForCategory.length === 0) {
        return true;
      }

      const subcategoryValue = buildCatSubcategoryValue(
        category.key,
        getCatPresetSubcategoryLabel(preset) || category.label,
      );
      return selectedSubcategoriesForCategory.includes(subcategoryValue);
    });
  }, [lang, presetsForLang, selectedCategories, selectedSubcategories]);

  const categoryFilterKey = `${selectedCategories.join("|")}::${selectedSubcategories.join("|")}`;
  const isCategoryFiltered = selectedCategories.length > 0;
  const visibleQuestionPresets = isCategoryFiltered
    ? filteredPresetsForLang.slice(0, visibleCategoryPresetCount)
    : examplePresets;
  const hasMoreCategoryPresets =
    isCategoryFiltered && visibleCategoryPresetCount < filteredPresetsForLang.length;
  const visibleCategoryPresetTotal = Math.min(visibleQuestionPresets.length, filteredPresetsForLang.length);
  const categoryResultsLabel = t.categoryResultsCount
    .replace("{shown}", String(visibleCategoryPresetTotal))
    .replace("{total}", String(filteredPresetsForLang.length));
  const loadMoreCategoryPresets = () => {
    setVisibleCategoryPresetCount((current) => current + CAT_CATEGORY_PRESET_INCREMENT);
  };

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
    if (isCategoryFiltered) {
      return;
    }

    setExamplePresets(pickRandomItems(filteredPresetsForLang, CAT_EXAMPLE_PRESET_COUNT));
  }, [filteredPresetsForLang, isCategoryFiltered]);

  useEffect(() => {
    setVisibleCategoryPresetCount(CAT_CATEGORY_PRESET_INCREMENT);
  }, [categoryFilterKey, lang]);

  useEffect(() => {
    setSelectedCategories((current) => {
      const next = current.filter((category) =>
        categoryOptionGroups.some((group) => group.options.some((option) => option.value === category)),
      );
      return next.length === current.length ? current : next;
    });
    setSelectedSubcategories((current) => {
      const validSubcategories = new Set(
        categoryOptionGroups.flatMap((group) =>
          group.options.flatMap((option) => option.subcategories?.map((subcategory) => subcategory.value) ?? []),
        ),
      );

      const next = current.filter((subcategory) => validSubcategories.has(subcategory));
      return next.length === current.length ? current : next;
    });
  }, [categoryOptionGroups]);

  const trackCatQuestionProgress = useCallback((slideIndex: number, source: "desktop" | "mobile") => {
    if (!activePreset || slides.length === 0) {
      return;
    }

    const safeIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
    const completionPercent = Math.round(((safeIndex + 1) / slides.length) * 100);
    const key = `${lang}:${activePreset.id}:${slides.length}`;

    if (safeIndex > maxTrackedSlideIndexRef.current) {
      maxTrackedSlideIndexRef.current = safeIndex;
      const progressCheckpoint = completionPercent >= 90 ? 90 : completionPercent >= 50 ? 50 : null;
      const progressKey = progressCheckpoint === null ? null : `${key}:${progressCheckpoint}`;
      if (progressCheckpoint !== null && progressKey && !trackedQuestionProgressKeyRef.current.has(progressKey)) {
        trackedQuestionProgressKeyRef.current.add(progressKey);
        trackEvent("content_progress", {
          section: "cats",
          content_type: "cat_question",
          content_id: activePreset.id,
          content_slug: activePreset.id,
          content_title: activePreset.prompt,
          language: lang,
          completion_percent: progressCheckpoint,
          step_index: safeIndex + 1,
          total_steps: slides.length,
          source,
        });
      }
    }

    if (safeIndex < slides.length - 1 || completedQuestionKeyRef.current === key) {
      return;
    }

    completedQuestionKeyRef.current = key;
    trackEvent("cat_question_completed", {
      section: "cats",
      content_type: "cat_question",
      content_id: activePreset.id,
      content_slug: activePreset.id,
      content_title: activePreset.prompt,
      language: lang,
      completion_percent: completionPercent,
      step_index: safeIndex + 1,
      total_steps: slides.length,
      source,
    });
    trackEvent("content_complete", {
      section: "cats",
      content_type: "cat_question",
      content_id: activePreset.id,
      content_slug: activePreset.id,
      content_title: activePreset.prompt,
      language: lang,
      completion_percent: completionPercent,
      step_index: safeIndex + 1,
      total_steps: slides.length,
      source,
    });
  }, [activePreset, lang, slides.length]);

  useEffect(() => {
    maxTrackedSlideIndexRef.current = -1;
    trackedQuestionProgressKeyRef.current = new Set();
    completedQuestionKeyRef.current = null;
  }, [activePreset?.id, lang, slides.length]);

  useEffect(() => {
    if (!usesTouchCatsLayout || mobileSlideshowLoading || mobileSlideshowSlides.length === 0) {
      return;
    }

    trackCatQuestionProgress(mobileSlideshowCurrentSlideIndex, "mobile");
  }, [
    mobileSlideshowCurrentSlideIndex,
    mobileSlideshowLoading,
    mobileSlideshowSlides.length,
    trackCatQuestionProgress,
    usesTouchCatsLayout,
  ]);

  useEffect(() => {
    const wrapper = slideScrollWrapperRef.current;
    if (
      usesTouchCatsLayout ||
      loading ||
      !wrapper ||
      slides.length === 0 ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const slideIndex = Number((entry.target as HTMLElement).dataset.slideIndex);
        if (Number.isFinite(slideIndex)) {
          trackCatQuestionProgress(slideIndex, "desktop");
        }
      });
    }, { threshold: 0.6 });

    wrapper.querySelectorAll<HTMLElement>("[data-slide-index]").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading, slides.length, trackCatQuestionProgress, usesTouchCatsLayout]);

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

  const clearCategories = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
  };

  const selectPresetFromSearch = (preset: AnyCatPreset) => {
    clearSearch();

    if (usesTouchCatsLayout) {
      void openMobilePreset(preset);
      return;
    }

    applyPreset(preset);
  };

  const applyPreset = (preset: AnyCatPreset) => {
    lastResolvedTextPresetKeyRef.current = preset.kind === "text" ? null : lastResolvedTextPresetKeyRef.current;
    setActivePresetId(preset.id);
    trackEvent("cat_question_opened", {
      section: "cats",
      content_type: "cat_question",
      content_id: preset.id,
      content_slug: preset.id,
      content_title: preset.prompt,
      language: lang,
    });
    trackEvent("content_open", {
      section: "cats",
      content_type: "cat_question",
      content_id: preset.id,
      content_slug: preset.id,
      content_title: preset.prompt,
      language: lang,
    });
    if (preset.kind === "full") {
      setError(null);
    }
  };

  const openMobilePreset = async (preset: AnyCatPreset) => {
    lastResolvedTextPresetKeyRef.current = preset.kind === "text" ? `${lang}:${preset.id}` : null;
    setActivePresetId(preset.id);
    setError(null);
    setPendingQuestion(preset.prompt);
    trackEvent("cat_question_opened", {
      section: "cats",
      content_type: "cat_question",
      content_id: preset.id,
      content_slug: preset.id,
      content_title: preset.prompt,
      language: lang,
    });
    trackEvent("content_open", {
      section: "cats",
      content_type: "cat_question",
      content_id: preset.id,
      content_slug: preset.id,
      content_title: preset.prompt,
      language: lang,
    });
    mobileSlideshowOpen({ loading: true });

    try {
      const next = await getSlidesForPreset(preset);
      const viewerSlides = buildStudioSlides(next.slides, next.seed);

      setInputText(next.prompt);
      setSlides(next.slides);
      mobileSlideshowReplaceSlides(viewerSlides);
    } catch {
      setError(t.errors.generic);
      trackEvent("error_seen", {
        section: "cats",
        content_id: preset.id,
        content_title: preset.prompt,
        language: lang,
        error_message: t.errors.generic,
      });
      mobileSlideshowClose();
    } finally {
      setPendingQuestion("");
    }
  };

  const findAlternativeImage = async (slideText: string, currentImage?: string) => {
    void currentImage;
    const alternative = await findAlternativeSlideMedia({
      queries: [buildShortSlideMediaQuery("cat", slideText), "cat"],
      excludedUrls: slides.map((slide) => slide.image).filter(Boolean) as string[],
      preferredSources: ["giphy", "pexels", "laplapla"],
      selectionSeed: slideText,
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
                mediaType: isVideoMediaUrl(nextImage) ? "video" : "image",
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
    trackEvent("cat_question_opened", {
      section: "cats",
      content_type: "cat_question",
      content_id: randomPreset.id,
      content_slug: randomPreset.id,
      content_title: randomPreset.prompt,
      language: lang,
      source: "random",
    });
    trackEvent("content_open", {
      section: "cats",
      content_type: "cat_question",
      content_id: randomPreset.id,
      content_slug: randomPreset.id,
      content_title: randomPreset.prompt,
      language: lang,
      source: "random",
    });
    mobileSlideshowOpen({ loading: true });

    try {
      const next = await getSlidesForPreset(randomPreset);
      setInputText(next.prompt);
      setSlides(next.slides);
      mobileSlideshowReplaceSlides(buildStudioSlides(next.slides, next.seed));
    } catch {
      setError(t.errors.generic);
      trackEvent("error_seen", {
        section: "cats",
        content_id: randomPreset.id,
        content_title: randomPreset.prompt,
        language: lang,
        error_message: t.errors.generic,
      });
      mobileSlideshowSetLoading(false);
    } finally {
      setPendingQuestion("");
    }
  };

  const handleEditInStudio = (sourceSlides: CatRuntimeSlide[]) => {
    trackEvent("studio_open", {
      section: "studio",
      studio_type: "cats",
      content_id: activePresetId,
      content_title: inputText,
      language: lang,
      source_page: router.asPath,
      entry_point: "cats_page",
      total_steps: sourceSlides.length,
    });
    sessionStorage.setItem("catsSlides", JSON.stringify({
      slides: sourceSlides,
      prompt: inputText,
      presetId: activePresetId,
      lang,
    }));
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
          groups={availableCategoryGroups}
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
        {visibleQuestionPresets.map((item) => (
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
      {isCategoryFiltered ? (
        <div className="cats-category-results-footer cats-category-results-footer-mobile">
          <span className="cats-category-results-count">{categoryResultsLabel}</span>
          {hasMoreCategoryPresets ? (
            <button
              type="button"
              className="cats-load-more-questions"
              onClick={loadMoreCategoryPresets}
            >
              {t.loadMoreQuestions}
            </button>
          ) : null}
        </div>
      ) : null}
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
        {usesTouchCatsLayout ? (
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
              {visibleQuestionPresets.map((item) => (
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
            {isCategoryFiltered ? (
              <div className="cats-category-results-footer">
                <span className="cats-category-results-count">{categoryResultsLabel}</span>
                {hasMoreCategoryPresets ? (
                  <button
                    type="button"
                    className="cats-load-more-questions"
                    onClick={loadMoreCategoryPresets}
                  >
                    {t.loadMoreQuestions}
                  </button>
                ) : null}
              </div>
            ) : null}

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
                  <Image
                    src="/spinners/CatSpinner.svg"
                    alt="Котик думает..."
                    width={64}
                    height={64}
                  />
                  <p className="cat-spinner-text">{t.thinkingLong}</p>
                </div>
              ) : (
                <div ref={slideScrollWrapperRef} className="slide-scroll-wrapper">
                  {slides.map((slide, idx) => {
                    if (!slide.text || !slide.image) return null;

                    return (
                      <div key={idx} className="cat-slide" data-slide-index={idx}>
                        {isVideoMediaUrl(slide.image) ? (
                          <video
                            className="cat-slide-video"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          >
                            <source src={slide.image} type={slide.image.includes(".webm") ? "video/webm" : "video/mp4"} />
                          </video>
                        ) : (
                          <Image
                            src={slide.image}
                            alt={slide.text || "illustration"}
                            className="cat-slide-image"
                            width={768}
                            height={768}
                            unoptimized
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

            <Image src="/cat/mouse-hanging.webp" alt="" className="hanging-mouse" width={140} height={240} />
            <Image src="/cat/ball.webp" alt="" className="rolling-ball" width={120} height={120} />
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
