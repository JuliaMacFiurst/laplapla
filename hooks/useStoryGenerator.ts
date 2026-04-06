import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import { fallbackImages } from "@/constants";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import { buildSupabaseStorageUrl } from "@/lib/publicAssetUrls";
import {
  STORY_STEP_KEYS,
  blocksToSlides,
  type NormalizedStoryTemplate,
  type StoryBlock,
  type StoryHeroOption,
  type StoryPath,
  type StorySlide,
  type StoryStepKey,
} from "@/lib/story/story-shared";

export type StoryDraftState = {
  mode: "template" | "custom" | "user_story" | null;
  selectedTemplateId: string | null;
  selectedUserStoryId: string | null;
  heroInput: string;
  currentStep: StoryStepKey | null;
  path: Partial<StoryPath>;
  accumulatedStory: StoryBlock[];
  slideshow: StorySlide[];
  loading: {
    template: boolean;
    generating: boolean;
    assembling: boolean;
  };
  error: string | null;
};

type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

type LibraryMediaItem = {
  url: string;
  mediaType: "image" | "video" | "gif";
};

type StoryTexts = {
  narrationAuto: (hero: string) => string;
  templateIntroPrompt: string;
  customStepTitles: Record<StoryStepKey, string>;
  customStepPrompts: Record<StoryStepKey, (hero: string) => string>;
  validationChooseHero: string;
  validationTemplateIntro: string;
  validationAnswerShort: string;
  templatePreviewError: string;
};

type TemplatePreviewResponse = {
  templateId: string;
  path: StoryPath;
  story: StoryBlock[];
  warnings?: string[];
  errors?: string[];
};

type ApprovedUserStoryResponse = {
  heroName: string;
  slides: StorySlide[];
  translated: boolean;
};

const CAPYBARA_WEBM = buildSupabaseStorageUrl("characters/cats/cap-paw.webm");

const getFallbackImage = (seed: number) => `/images/capybaras/${fallbackImages[seed % fallbackImages.length]}`;

const hashString = (value: string) =>
  Array.from(value).reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 0);

const buildInitialState = (): StoryDraftState => ({
  mode: null,
  selectedTemplateId: null,
  selectedUserStoryId: null,
  heroInput: "",
  currentStep: null,
  path: {},
  accumulatedStory: [],
  slideshow: [],
  loading: {
    template: false,
    generating: false,
    assembling: false,
  },
  error: null,
});

const trimAnswer = (value: string) => value.trim().replace(/\s+/g, " ");

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}`);
  }

  if (!payload) {
    throw new Error("Empty response payload");
  }

  return payload;
}

async function loadHeroOptions(lang: Lang) {
  const response = await fetch(`/api/story/heroes?lang=${lang}`);
  return parseJsonResponse<StoryHeroOption[]>(response);
}

async function loadApprovedUserStory(submissionId: string, lang: Lang) {
  const response = await fetch(`/api/story/submission?id=${encodeURIComponent(submissionId)}&lang=${lang}`);
  return parseJsonResponse<ApprovedUserStoryResponse>(response);
}

async function loadStoryTemplate(templateId: string, lang: Lang) {
  const response = await fetch(`/api/story/template?id=${encodeURIComponent(templateId)}&lang=${lang}`);
  return parseJsonResponse<NormalizedStoryTemplate>(response);
}

async function fetchGiphy(query: string) {
  const response = await fetch("/api/giphy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, limit: 8 }),
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { items?: Array<{ url?: string; mediaType?: "gif" }> };
  return (data.items || [])
    .map((item) => ({ url: item.url || "", mediaType: "gif" as const }))
    .filter((item) => Boolean(item.url));
}

async function fetchPexels(query: string) {
  const response = await fetch("/api/pexels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, limit: 10 }),
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { items?: Array<{ url?: string; mediaType?: "image" | "video" }> };
  return (data.items || [])
    .map((item) => ({ url: item.url || "", mediaType: item.mediaType || "image" }))
    .filter((item) => Boolean(item.url));
}

function uniqQueries(values: string[]) {
  return values
    .map((value) => value.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function buildSlideKeywords(slide: StorySlide) {
  return slide.keywords?.length ? slide.keywords : slide.text.split(/\s+/).slice(0, 5);
}

function buildContextQueries(slide: StorySlide) {
  const keywords = buildSlideKeywords(slide);
  const keywordPhrase = keywords.join(" ").trim();

  return uniqQueries([
    keywordPhrase,
    slide.text.split(/[.!?…]/)[0] || slide.text,
    keywords.slice(0, 3).join(" "),
    keywords[0] || "",
  ]);
}

function buildCapybaraQueries(slide: StorySlide) {
  const keywords = buildSlideKeywords(slide);
  const keywordPhrase = keywords.join(" ").trim();

  return uniqQueries([
    `capybara ${keywordPhrase}`,
    `cute capybara ${keywords[0] || ""}`,
    `funny capybara ${keywords[0] || ""}`,
    "cute capybara",
    "funny capybara",
    "capybara",
  ]);
}

function getCapybaraPriorityIndices(totalSlides: number) {
  if (totalSlides <= 0) {
    return new Set<number>();
  }

  const quota = totalSlides >= 6 ? 3 : Math.min(2, totalSlides);
  const indices = new Set<number>();
  const anchors = quota === 3
    ? [0, Math.floor((totalSlides - 1) / 2), totalSlides - 1]
    : [0, totalSlides - 1];

  anchors.forEach((index) => {
    if (index >= 0 && index < totalSlides) {
      indices.add(index);
    }
  });

  for (let index = 0; indices.size < quota && index < totalSlides; index += 1) {
    indices.add(index);
  }

  return indices;
}

function toSlideMedia(item: LibraryMediaItem): SlideMedia {
  if (item.mediaType === "gif") {
    return { type: "gif", gifUrl: item.url, capybaraImage: item.url };
  }

  if (item.mediaType === "video") {
    return { type: "video", videoUrl: item.url, capybaraImage: item.url };
  }

  return { type: "image", imageUrl: item.url, capybaraImage: item.url };
}

async function searchItems(
  queries: string[],
  searchFn: (query: string) => Promise<LibraryMediaItem[]>,
  excludedUrls: Set<string>,
) {
  for (const query of queries) {
    const items = await searchFn(query);
    const next = items.find((item) => !excludedUrls.has(item.url));
    if (next) {
      return next;
    }
  }

  return null;
}

async function resolveSlideMedia(
  slide: StorySlide,
  index: number,
  totalSlides: number,
  excludedUrls: Set<string>,
): Promise<SlideMedia> {
  const contextQueries = buildContextQueries(slide);
  const capybaraQueries = buildCapybaraQueries(slide);
  const actionStep = slide.step === "journey" || slide.step === "problem" || slide.step === "solution";
  const capybaraPriorityIndices = getCapybaraPriorityIndices(totalSlides);
  const shouldPrioritizeCapybara = capybaraPriorityIndices.has(index);

  const searchPlan = shouldPrioritizeCapybara
    ? [
        { queries: capybaraQueries, searchFn: fetchGiphy },
        { queries: capybaraQueries, searchFn: fetchPexels },
        { queries: contextQueries, searchFn: actionStep ? fetchGiphy : fetchPexels },
        { queries: contextQueries, searchFn: actionStep ? fetchPexels : fetchGiphy },
      ]
    : [
        { queries: contextQueries, searchFn: actionStep ? fetchGiphy : fetchPexels },
        { queries: contextQueries, searchFn: actionStep ? fetchPexels : fetchGiphy },
        { queries: capybaraQueries, searchFn: fetchGiphy },
        { queries: capybaraQueries, searchFn: fetchPexels },
      ];

  for (const step of searchPlan) {
    const item = await searchItems(step.queries, step.searchFn, excludedUrls);
    if (item) {
      excludedUrls.add(item.url);
      return toSlideMedia(item);
    }
  }

  const fallbackImage = slide.mediaUrl || getFallbackImage(index + hashString(slide.text));
  return {
    type: "image",
    imageUrl: fallbackImage,
    capybaraImage: fallbackImage,
    capybaraImageAlt: "Capybara",
  };
}

export function useStoryGenerator(lang: Lang, texts: StoryTexts) {
  const [draft, setDraft] = useState<StoryDraftState>(buildInitialState);
  const [heroOptions, setHeroOptions] = useState<StoryHeroOption[]>([]);
  const [template, setTemplate] = useState<NormalizedStoryTemplate | null>(null);
  const [activeUserStoryTranslated, setActiveUserStoryTranslated] = useState(true);
  const [mediaCache, setMediaCache] = useState<Map<number, SlideMedia>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCapybaraAnimating, setIsCapybaraAnimating] = useState(false);
  const mediaLoadIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextHeroOptions = await loadHeroOptions(lang);
        if (!cancelled) {
          setHeroOptions(nextHeroOptions);
        }
      } catch (error) {
        if (!cancelled) {
          setDraft((prev) => ({ ...prev, error: error instanceof Error ? error.message : "Failed to load story heroes" }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    setDraft((prev) => {
      const heroInput = prev.heroInput.trim();
      const nextMode = heroInput
        ? "custom"
        : prev.selectedUserStoryId
          ? "user_story"
          : prev.selectedTemplateId
            ? "template"
            : null;
      if (nextMode === prev.mode) {
        return prev;
      }

      return {
        ...prev,
        mode: nextMode,
        error: null,
      };
    });
  }, [draft.heroInput, draft.selectedTemplateId, draft.selectedUserStoryId]);

  useEffect(() => {
    if (!draft.currentStep && !draft.loading.generating && !draft.loading.assembling) {
      return;
    }

    setIsCapybaraAnimating(true);
    const timer = window.setTimeout(() => setIsCapybaraAnimating(false), 1400);
    return () => window.clearTimeout(timer);
  }, [draft.currentStep, draft.loading.assembling, draft.loading.generating, draft.loading.template]);

  useEffect(() => {
    if (draft.slideshow.length === 0) {
      setMediaCache(new Map());
      setCurrentSlideIndex(0);
      return;
    }

    const loadId = ++mediaLoadIdRef.current;
    setMediaCache(new Map());

    void (async () => {
      const excludedUrls = new Set<string>();
      const results: SlideMedia[] = [];

      for (let index = 0; index < draft.slideshow.length; index += 1) {
        const slide = draft.slideshow[index];
        try {
          const media = await resolveSlideMedia(slide, index, draft.slideshow.length, excludedUrls);
          const resolvedUrl = media.gifUrl || media.videoUrl || media.imageUrl || media.capybaraImage;
          if (resolvedUrl) {
            excludedUrls.add(resolvedUrl);
          }
          results.push(media);
        } catch {
          const fallbackImage = getFallbackImage(index);
          results.push({
            type: "image",
            imageUrl: fallbackImage,
            capybaraImage: fallbackImage,
          });
        }
      }

      if (mediaLoadIdRef.current !== loadId) {
        return;
      }

      setMediaCache(new Map(results.map((item, index) => [index, item])));
    })();
  }, [draft.slideshow]);

  const heroName = useMemo(() => {
    if (draft.heroInput.trim()) {
      return draft.heroInput.trim();
    }

    const selectedOption = heroOptions.find((item) =>
      item.type === "user_story"
        ? item.id === draft.selectedUserStoryId
        : item.id === draft.selectedTemplateId,
    );

    return selectedOption?.heroName || template?.heroName || "Капибара";
  }, [draft.heroInput, draft.selectedTemplateId, draft.selectedUserStoryId, heroOptions, template?.heroName]);

  const loadUserStory = useCallback(async (submissionId: string) => {
    setTemplate(null);
    setActiveUserStoryTranslated(lang === "ru");
    setDraft((prev) => ({
      ...prev,
      error: null,
      loading: { ...prev.loading, template: true },
      currentStep: null,
      path: {},
      accumulatedStory: [],
      slideshow: [],
    }));

    try {
      const userStory = await loadApprovedUserStory(submissionId, lang);
      setActiveUserStoryTranslated(userStory.translated);
      setDraft((prev) => ({
        ...prev,
        mode: "user_story",
        selectedTemplateId: null,
        selectedUserStoryId: submissionId,
        error: null,
        currentStep: null,
        path: {},
        accumulatedStory: [],
        slideshow: userStory.slides,
        loading: { ...prev.loading, template: false },
      }));
    } catch (error) {
      setDraft((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load user story",
        loading: { ...prev.loading, template: false },
      }));
    }
  }, [lang]);

  useEffect(() => {
    if (
      draft.mode === "user_story"
      && draft.selectedUserStoryId
      && draft.slideshow.length === 0
      && !draft.loading.template
    ) {
      void loadUserStory(draft.selectedUserStoryId);
    }
  }, [draft.loading.template, draft.mode, draft.selectedUserStoryId, draft.slideshow.length, loadUserStory]);

  const setSelectedHeroOption = useCallback((option: StoryHeroOption | null) => {
    setTemplate(null);
    if (!option) {
      setActiveUserStoryTranslated(lang === "ru");
      setDraft((prev) => ({
        ...prev,
        selectedTemplateId: null,
        selectedUserStoryId: null,
        error: null,
        slideshow: [],
        accumulatedStory: [],
        currentStep: null,
        path: {},
      }));
      return;
    }

    setActiveUserStoryTranslated(option.type === "user_story" ? Boolean(option.translated ?? lang === "ru") : true);

    if (option.type === "template") {
      setDraft((prev) => ({
        ...prev,
        selectedTemplateId: option.id,
        selectedUserStoryId: null,
        error: null,
        slideshow: [],
        accumulatedStory: [],
        currentStep: null,
        path: {},
      }));
      return;
    }

    setDraft((prev) => ({
      ...prev,
      selectedTemplateId: null,
      selectedUserStoryId: option.id,
      error: null,
      slideshow: [],
      accumulatedStory: [],
      currentStep: null,
      path: {},
    }));
    void loadUserStory(option.id);
  }, [lang, loadUserStory]);

  const setHeroInput = useCallback((heroInput: string) => {
    setDraft((prev) => ({
      ...prev,
      heroInput,
      error: null,
      slideshow: [],
      accumulatedStory: [],
      currentStep: null,
      path: {},
    }));
  }, []);

  const beginTemplateFlow = useCallback(async () => {
    if (!draft.selectedTemplateId) {
      setDraft((prev) => ({ ...prev, error: texts.validationChooseHero }));
      return;
    }

    setDraft((prev) => ({
      ...prev,
      error: null,
      loading: { ...prev.loading, template: true },
    }));

    try {
      const nextTemplate = await loadStoryTemplate(draft.selectedTemplateId, lang);
      setTemplate(nextTemplate);
      setDraft((prev) => ({
        ...prev,
        currentStep: "intro",
        path: {},
        loading: { ...prev.loading, template: false },
      }));
    } catch (error) {
      setDraft((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load template",
        loading: { ...prev.loading, template: false },
      }));
    }
  }, [draft.selectedTemplateId, lang, texts.validationChooseHero]);

  const chooseTemplateIntro = useCallback(async (choiceIndex: 0 | 1 | 2) => {
    if (!template) {
      return;
    }

    const nextPath: Partial<StoryPath> = { intro: choiceIndex };

    setDraft((prev) => ({
      ...prev,
      loading: { ...prev.loading, assembling: true },
      error: null,
      currentStep: null,
      path: nextPath,
    }));

    try {
      const response = await fetch(`/api/story/preview?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          introChoiceIndex: choiceIndex,
        }),
      });

      const payload = await response.json() as Partial<TemplatePreviewResponse> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || texts.templatePreviewError);
      }

      if (!payload.path || !Array.isArray(payload.story)) {
        throw new Error(texts.templatePreviewError);
      }

      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        throw new Error(payload.errors.join("\n"));
      }

      const resolvedPath = payload.path;
      const storyBlocks = payload.story;
      const slideshow = blocksToSlides(storyBlocks);

      setDraft((prev) => ({
        ...prev,
        path: resolvedPath,
        accumulatedStory: storyBlocks,
        slideshow,
        loading: { ...prev.loading, assembling: false },
      }));
    } catch (error) {
      setDraft((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : texts.templatePreviewError,
        accumulatedStory: [],
        slideshow: [],
        loading: { ...prev.loading, assembling: false },
      }));
    }
  }, [lang, template, texts.templatePreviewError]);

  const beginCustomFlow = useCallback(() => {
    if (!draft.heroInput.trim()) {
      setDraft((prev) => ({ ...prev, error: texts.validationChooseHero }));
      return;
    }

    setDraft((prev) => ({
      ...prev,
      error: null,
      currentStep: "narration",
      accumulatedStory: [],
      slideshow: [],
      path: {},
    }));
  }, [draft.heroInput, texts.validationChooseHero]);

  const submitCustomStep = useCallback((rawAnswer: string) => {
    if (!draft.currentStep) {
      return;
    }

    const cleanedAnswer = trimAnswer(rawAnswer);
    const stepKey = draft.currentStep;
    const nextStepIndex = STORY_STEP_KEYS.indexOf(stepKey) + 1;
    const nextStep = STORY_STEP_KEYS[nextStepIndex] || null;

    let stepText = cleanedAnswer;
    if (stepKey === "narration" && stepText.length === 0) {
      stepText = texts.narrationAuto(heroName);
    }

    if (stepText.length < 3) {
      setDraft((prev) => ({ ...prev, error: texts.validationAnswerShort }));
      return;
    }

    const nextBlock: StoryBlock = {
      step: stepKey,
      text: stepText,
      slides: [stepText],
      keywords: [],
    };

    setDraft((prev) => {
      const accumulatedStory = [...prev.accumulatedStory, nextBlock];
      const nextDraft = {
        ...prev,
        error: null,
        accumulatedStory,
        currentStep: nextStep,
      };

      if (!nextStep) {
        return {
          ...nextDraft,
          loading: { ...prev.loading, assembling: true },
        };
      }

      return nextDraft;
    });
  }, [draft.currentStep, heroName, texts.narrationAuto, texts.validationAnswerShort]);

  useEffect(() => {
    if (draft.loading.assembling && draft.mode === "custom" && draft.currentStep === null && draft.accumulatedStory.length === STORY_STEP_KEYS.length) {
      const slideshow = blocksToSlides(draft.accumulatedStory);
      setDraft((prev) => ({
        ...prev,
        slideshow,
        loading: { ...prev.loading, assembling: false },
      }));
    }
  }, [draft.accumulatedStory, draft.currentStep, draft.loading.assembling, draft.mode]);

  const openInEditor = useCallback(() => {
    const studioSlides = draft.slideshow.map((slide, index) => {
      const media = mediaCache.get(index);
      const mediaUrl = media?.capybaraImage || media?.imageUrl || media?.gifUrl || media?.videoUrl || slide.mediaUrl;
      const mediaType = media?.videoUrl
        || mediaUrl?.includes(".mp4")
        || mediaUrl?.includes(".webm")
        ? "video"
        : "image";

      return {
        text: slide.text,
        image: mediaUrl,
        mediaFit: (slide as typeof slide & { mediaFit?: "cover" | "contain" }).mediaFit ?? "contain",
        mediaPosition: "center",
        textPosition: (slide as typeof slide & { textPosition?: "top" | "center" | "bottom" }).textPosition ?? "bottom",
        textAlign: (slide as typeof slide & { textAlign?: "left" | "center" | "right" }).textAlign ?? "center",
        textBgEnabled: (slide as typeof slide & { textBgEnabled?: boolean }).textBgEnabled ?? true,
        textBgColor: (slide as typeof slide & { textBgColor?: string }).textBgColor ?? "#ffffff",
        textBgOpacity: (slide as typeof slide & { textBgOpacity?: number }).textBgOpacity ?? 1,
        mediaType,
      };
    });

    sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
    window.location.assign(`/cats/studio?${new URLSearchParams(buildLocalizedQuery(lang)).toString()}`);
  }, [draft.slideshow, lang, mediaCache]);

  const reset = useCallback(() => {
    setTemplate(null);
    setMediaCache(new Map());
    setCurrentSlideIndex(0);
    setDraft((prev) => ({
      ...buildInitialState(),
      selectedTemplateId: prev.selectedTemplateId,
      selectedUserStoryId: prev.selectedUserStoryId,
      heroInput: prev.heroInput,
      mode: prev.heroInput.trim()
        ? "custom"
        : prev.selectedUserStoryId
          ? "user_story"
          : prev.selectedTemplateId
            ? "template"
            : null,
    }));
  }, []);

  const templateIntroChoices = template?.steps.intro.choices || [];
  const previewText = draft.accumulatedStory.map((block) => block.text).join("\n\n");

  return {
    capybaraAnimationUrl: CAPYBARA_WEBM,
    currentSlideIndex,
    draft,
    heroName,
    isCapybaraAnimating,
    mediaCache,
    previewText,
    template,
    templateIntroChoices,
    activeUserStoryTranslated,
    heroOptions,
    texts,
    beginCustomFlow,
    beginTemplateFlow,
    chooseTemplateIntro,
    loadUserStory,
    openInEditor,
    reset,
    setCurrentSlideIndex,
    setHeroInput,
    setSelectedHeroOption,
    submitCustomStep,
  };
}
