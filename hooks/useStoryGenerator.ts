import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/i18n";
import { fallbackImages } from "@/constants";
import { buildLocalizedQuery } from "@/lib/i18n/routing";
import {
  STORY_STEP_KEYS,
  blocksToSlides,
  loadStoryTemplate,
  loadStoryTemplateSummaries,
  type NormalizedStoryTemplate,
  type StoryBlock,
  type StoryPath,
  type StorySlide,
  type StoryStepKey,
  type StoryTemplateSummary,
} from "@/lib/story/story-service";

export type StoryDraftState = {
  mode: "template" | "custom" | null;
  selectedTemplateId: string | null;
  heroInput: string;
  currentStep: StoryStepKey | null;
  path: Partial<StoryPath>;
  accumulatedStory: StoryBlock[];
  slideshow: StorySlide[];
  loading: {
    template: boolean;
    generating: boolean;
    assembling: boolean;
    saving: boolean;
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

type StoryTexts = {
  narrationAuto: (hero: string) => string;
  templateIntroPrompt: string;
  customStepTitles: Record<StoryStepKey, string>;
  customStepPrompts: Record<StoryStepKey, (hero: string) => string>;
  validationChooseHero: string;
  validationTemplateIntro: string;
  validationAnswerShort: string;
  savePendingLabel: string;
  templatePreviewError: string;
};

type TemplatePreviewResponse = {
  templateId: string;
  path: StoryPath;
  story: StoryBlock[];
  warnings?: string[];
  errors?: string[];
};

const CAPYBARA_WEBM = "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/cats/cap-paw.webm";

const getFallbackImage = (seed: number) => `/images/capybaras/${fallbackImages[seed % fallbackImages.length]}`;

const hashString = (value: string) =>
  Array.from(value).reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 0);

const buildInitialState = (): StoryDraftState => ({
  mode: null,
  selectedTemplateId: null,
  heroInput: "",
  currentStep: null,
  path: {},
  accumulatedStory: [],
  slideshow: [],
  loading: {
    template: false,
    generating: false,
    assembling: false,
    saving: false,
  },
  error: null,
});

const trimAnswer = (value: string) => value.trim().replace(/\s+/g, " ");

async function fetchGiphy(query: string) {
  const response = await fetch("/api/search-giphy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { gifs?: string[] };
  return data.gifs?.[0] || null;
}

async function fetchPexels(query: string, keywords: string[]) {
  const videoResponse = await fetch("/api/search-pexels-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (videoResponse.ok) {
    const data = await videoResponse.json() as {
      videos?: Array<{ videoUrl?: string; preview?: string; image?: string }>;
    };
    const video = data.videos?.[0];
    if (video?.videoUrl) {
      return {
        type: "video" as const,
        videoUrl: video.videoUrl,
        capybaraImage: video.preview || video.image,
      };
    }
  }

  const imageResponse = await fetch("/api/fetch-pexels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, type: "story", orientation: "landscape", size: "medium" }),
  });

  if (!imageResponse.ok) {
    return null;
  }

  const data = await imageResponse.json() as { images?: string[] };
  const imageUrl = data.images?.[0];
  return imageUrl ? { type: "image" as const, imageUrl, capybaraImage: imageUrl } : null;
}

async function resolveSlideMedia(slide: StorySlide, index: number): Promise<SlideMedia> {
  const keywords = slide.keywords?.length ? slide.keywords : slide.text.split(/\s+/).slice(0, 3);
  const query = keywords.join(" ") || slide.text;
  const actionStep = slide.step === "journey" || slide.step === "problem" || slide.step === "solution";

  if (actionStep) {
    const gifUrl = await fetchGiphy(query);
    if (gifUrl) {
      return { type: "gif", gifUrl };
    }
  }

  const pexelsResult = await fetchPexels(query, keywords);
  if (pexelsResult) {
    return pexelsResult;
  }

  const fallbackImage = slide.mediaUrl || getFallbackImage(index + hashString(slide.text));
  return {
    type: "image",
    imageUrl: fallbackImage,
    capybaraImage: fallbackImage,
    capybaraImageAlt: "Capybara",
  };
}

const buildBookPayload = (
  blocks: StoryBlock[],
  slides: StorySlide[],
  heroName: string,
  mode: StoryDraftState["mode"],
) => ({
  title: `История про ${heroName}`,
  author: "Capybara Story Generator",
  description: blocks.map((block) => block.text).join("\n\n"),
  slides,
  story_blocks: blocks,
  is_published: false,
  metadata: {
    source: "caps-story-generator",
    mode,
    heroName,
    steps: blocks.map((block) => block.step),
  },
});

export function useStoryGenerator(lang: Lang, texts: StoryTexts) {
  const [draft, setDraft] = useState<StoryDraftState>(buildInitialState);
  const [templates, setTemplates] = useState<StoryTemplateSummary[]>([]);
  const [template, setTemplate] = useState<NormalizedStoryTemplate | null>(null);
  const [mediaCache, setMediaCache] = useState<Map<number, SlideMedia>>(new Map());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCapybaraAnimating, setIsCapybaraAnimating] = useState(false);
  const mediaLoadIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextTemplates = await loadStoryTemplateSummaries();
        if (!cancelled) {
          setTemplates(nextTemplates);
        }
      } catch (error) {
        if (!cancelled) {
          setDraft((prev) => ({ ...prev, error: error instanceof Error ? error.message : "Failed to load templates" }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraft((prev) => {
      const heroInput = prev.heroInput.trim();
      const nextMode = heroInput ? "custom" : prev.selectedTemplateId ? "template" : null;
      if (nextMode === prev.mode) {
        return prev;
      }

      return {
        ...prev,
        mode: nextMode,
        error: null,
      };
    });
  }, [draft.heroInput, draft.selectedTemplateId]);

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
      const results = await Promise.all(
        draft.slideshow.map((slide, index) =>
          resolveSlideMedia(slide, index).catch(() => ({
            type: "image" as const,
            imageUrl: getFallbackImage(index),
            capybaraImage: getFallbackImage(index),
          })),
        ),
      );

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

    const selectedTemplate = templates.find((item) => item.id === draft.selectedTemplateId);
    return selectedTemplate?.heroName || template?.heroName || "Капибара";
  }, [draft.heroInput, draft.selectedTemplateId, template?.heroName, templates]);

  const setSelectedTemplateId = useCallback((selectedTemplateId: string | null) => {
    setSaveMessage(null);
    setTemplate(null);
    setDraft((prev) => ({
      ...prev,
      selectedTemplateId,
      error: null,
      slideshow: [],
      accumulatedStory: [],
      currentStep: null,
      path: {},
    }));
  }, []);

  const setHeroInput = useCallback((heroInput: string) => {
    setSaveMessage(null);
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

    setSaveMessage(null);
    setDraft((prev) => ({
      ...prev,
      error: null,
      loading: { ...prev.loading, template: true },
    }));

    try {
      const nextTemplate = await loadStoryTemplate(draft.selectedTemplateId);
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
  }, [draft.selectedTemplateId, texts.validationChooseHero]);

  const chooseTemplateIntro = useCallback(async (choiceIndex: 0 | 1 | 2) => {
    if (!template) {
      return;
    }

    setSaveMessage(null);
    const nextPath: Partial<StoryPath> = { intro: choiceIndex };

    setDraft((prev) => ({
      ...prev,
      loading: { ...prev.loading, assembling: true },
      error: null,
      currentStep: null,
      path: nextPath,
    }));

    try {
      const response = await fetch("/api/story/preview", {
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
  }, [template, texts.templatePreviewError]);

  const beginCustomFlow = useCallback(() => {
    if (!draft.heroInput.trim()) {
      setDraft((prev) => ({ ...prev, error: texts.validationChooseHero }));
      return;
    }

    setSaveMessage(null);
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
      keywords: [],
    };

    setSaveMessage(null);
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

  const saveStory = useCallback(async () => {
    if (draft.slideshow.length !== STORY_STEP_KEYS.length) {
      return;
    }

    setSaveMessage(null);
    setDraft((prev) => ({
      ...prev,
      loading: { ...prev.loading, saving: true },
      error: null,
    }));

    try {
      const response = await fetch("/api/admin/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBookPayload(draft.accumulatedStory, draft.slideshow, heroName, draft.mode)),
      });

      if (!response.ok) {
        throw new Error(texts.savePendingLabel);
      }

      setSaveMessage(texts.savePendingLabel);
    } catch (error) {
      setDraft((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : texts.savePendingLabel,
      }));
    } finally {
      setDraft((prev) => ({
        ...prev,
        loading: { ...prev.loading, saving: false },
      }));
    }
  }, [draft.accumulatedStory, draft.mode, draft.slideshow, heroName, texts.savePendingLabel]);

  const openInEditor = useCallback(() => {
    const studioSlides = draft.slideshow.map((slide, index) => {
      const media = mediaCache.get(index);
      return {
        text: slide.text,
        image: media?.capybaraImage || media?.imageUrl || media?.gifUrl || media?.videoUrl || slide.mediaUrl,
      };
    });

    sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
    window.location.assign(`/cats/studio?${new URLSearchParams(buildLocalizedQuery(lang)).toString()}`);
  }, [draft.slideshow, lang, mediaCache]);

  const reset = useCallback(() => {
    setTemplate(null);
    setSaveMessage(null);
    setMediaCache(new Map());
    setCurrentSlideIndex(0);
    setDraft((prev) => ({
      ...buildInitialState(),
      selectedTemplateId: prev.selectedTemplateId,
      heroInput: prev.heroInput,
      mode: prev.heroInput.trim() ? "custom" : prev.selectedTemplateId ? "template" : null,
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
    saveMessage,
    template,
    templateIntroChoices,
    templates,
    texts,
    beginCustomFlow,
    beginTemplateFlow,
    chooseTemplateIntro,
    openInEditor,
    reset,
    saveStory,
    setCurrentSlideIndex,
    setHeroInput,
    setSelectedTemplateId,
    submitCustomStep,
  };
}
