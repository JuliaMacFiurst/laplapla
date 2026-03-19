import { useCallback, useEffect, useRef, useState } from "react";
import { fallbackImages } from "@/constants";
import type { dictionaries, Lang } from "@/i18n";
import { supabase } from "@/lib/supabase";
import type { Book, BookExplanation, BookTest, ExplanationMode, Slide } from "@/types/types";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface BookHistoryEntry {
  book: Book;
  slides: Slide[];
  tests: BookTest[];
}

interface LoadBookOptions {
  pushHistory?: boolean;
  signal?: AbortSignal;
}

interface ResolvedSlideMedia {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
}

interface SlideMediaPlan {
  type: "giphy" | "pexels" | "fallback";
  query: string;
}

interface BookUiState {
  modeId: string | number | null;
  slideIndex: number;
  showQuiz: boolean;
}

interface UseBookOptions {
  initialBook?: Book | null;
  disableInitialRandom?: boolean;
  initialModeId?: string | number | null;
}

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const createAbortError = () => {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
};

const getFallbackImage = () =>
  `/images/capybaras/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;

const MEDIA_TIMEOUT_MS = 1500;

const mediaResultCache = new Map<string, ResolvedSlideMedia>();
let giphyUsed = 0;
const MAX_GIPHY = 3;
const capybaraQueries = [
  "capybara",
  "cute capybara",
  "capybara funny",
  "capybara gif",
  "capybara animal",
];

const STOP_WORDS = new Set([
  "и", "в", "во", "на", "с", "со", "к", "ко", "у", "о", "об", "от", "до", "по", "за", "из", "под",
  "над", "для", "что", "как", "а", "но", "или", "же", "ли", "не", "ни", "это", "тот", "та", "те",
  "они", "она", "он", "мы", "вы", "ты", "я", "его", "ее", "их", "свои", "свой", "свою", "своим",
  "там", "тут", "вдруг", "ой", "ах", "эх", "ну", "бы",
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "at", "for", "with", "from", "by",
  "he", "she", "they", "we", "you", "it", "this", "that", "these", "those", "into", "over",
]);

const WEAK_WORDS = new Set([
  "пошли",
  "увидели",
  "оказались",
  "решили",
  "встретили",
  "сказал",
  "сказала",
  "сказали",
  "достигают",
  "идут",
  "идет",
  "идём",
  "пришли",
  "подошли",
]);

const RUSSIAN_ENDINGS = /(?:ого|его|ому|ему|ыми|ими|ами|ями|иях|иях|ах|ях|ов|ев|ий|ый|ой|ая|яя|ое|ее|ые|ие|а|я|ы|и|у|ю|е|о)$/u;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const hashString = (value: string) =>
  Array.from(value).reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 0);

const stemRussianWord = (word: string) => {
  const stemmed = word.replace(RUSSIAN_ENDINGS, "");
  return stemmed.length >= 4 ? stemmed : word;
};

export const extractSlideKeywords = (text: string): string[] => {
  const originalTokens = text.match(/\p{L}+/gu) || [];

  return unique(
    originalTokens
      .map((token, index) => ({ token, index }))
      .filter(({ token, index }) => !(index > 0 && /^\p{Lu}/u.test(token)))
      .map(({ token }) => normalizeText(token))
      .filter((word) => word.length >= 4)
      .filter((word) => !STOP_WORDS.has(word))
      .filter((word) => !WEAK_WORDS.has(word))
      .map(stemRussianWord)
      .filter((word) => word.length >= 4)
      .filter((word) => !STOP_WORDS.has(word))
      .filter((word) => !WEAK_WORDS.has(word))
      .sort((a, b) => b.length - a.length)
      .slice(0, 3),
  );
};

const buildSlideCacheKey = (slide: Slide) =>
  JSON.stringify({
    text: normalizeText(slide.text),
    keywords: slide.keywords || [],
  });

const shouldUseContextMedia = (slideIndex: number, totalSlides: number) =>
  slideIndex === 0 ||
  slideIndex === Math.floor(totalSlides / 2) ||
  slideIndex === totalSlides - 1;

const pickCapybaraQuery = (slide: Slide) => {
  const seed = hashString(buildSlideCacheKey(slide));
  return capybaraQueries[seed % capybaraQueries.length];
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T | null;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const getModeLabel = (mode: ExplanationMode) =>
  String(mode.title || mode.name || mode.slug || `Mode ${mode.id}`);

const getMeaningModeId = (modes: ExplanationMode[]) => {
  const match = modes.find((mode) => {
    const label = getModeLabel(mode).toLowerCase();
    return (
      label.includes("meaning") ||
      label.includes("смысл") ||
      label.includes("explain") ||
      label.includes("объяс")
    );
  });

  return match?.id;
};

const buildMediaUrl = (endpoint: string, slide: Slide) => {
  const params = new URLSearchParams();
  if (slide.keywords?.length) {
    params.set("keywords", slide.keywords.join(","));
  }
  if (slide.mood) {
    params.set("mood", slide.mood);
  }
  const query = params.toString();
  return query ? `${endpoint}?${query}` : endpoint;
};

const searchGiphyMeaning = async (query: string, signal?: AbortSignal): Promise<ResolvedSlideMedia | null> => {
  const cacheKey = `giphy:${query}`;
  const cached = mediaResultCache.get(cacheKey);
  if (cached) {
    if (process.env.NODE_ENV === "development") {
      console.log("[MEDIA] cache hit:", cacheKey);
    }
    return cached;
  }

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  console.log("[MEDIA] preload:", query, "giphy");

  const response = await fetch("/api/search-giphy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { gifs?: string[] };
  const gifUrl = data.gifs?.[0];
  const result = gifUrl ? { type: "gif" as const, gifUrl } : null;
  if (result) {
    mediaResultCache.set(cacheKey, result);
  }
  return result;
};

const searchPexelsMeaning = async (query: string, keywords?: string[], signal?: AbortSignal): Promise<ResolvedSlideMedia | null> => {
  const normalizedKeywords = keywords?.length ? keywords : query.split(" ").filter(Boolean);
  const videoResponse = await fetch("/api/search-pexels-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (videoResponse.ok) {
    const videoData = (await videoResponse.json()) as {
      videos?: Array<{ videoUrl?: string; preview?: string; image?: string }>;
    };
    const video = videoData.videos?.[0];
    if (video?.videoUrl) {
      return {
        type: "video",
        videoUrl: video.videoUrl,
        capybaraImage: video.preview || video.image,
      };
    }
  }

  const imageResponse = await fetch("/api/fetch-pexels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: normalizedKeywords, type: "story", orientation: "landscape", size: "medium" }),
    signal,
  });

  if (!imageResponse.ok) {
    return null;
  }

  const imageData = (await imageResponse.json()) as { images?: string[] };
  const imageUrl = imageData.images?.[0];
  return imageUrl ? { type: "image", imageUrl, capybaraImage: imageUrl } : null;
};

const searchCapybaraFallback = async (slide: Slide, signal?: AbortSignal): Promise<ResolvedSlideMedia | null> => {
  const gifResponse = await fetch(buildMediaUrl("/api/capybara-gifs", slide), { signal });
  if (gifResponse.ok) {
    const gifs = (await gifResponse.json()) as Array<{ gifUrl?: string }>;
    const gifUrl = gifs[0]?.gifUrl;
    if (gifUrl) {
      return { type: "gif", gifUrl };
    }
  }

  const imageResponse = await fetch(buildMediaUrl("/api/capybara-images", slide), { signal });
  if (!imageResponse.ok) {
    return null;
  }

  const images = (await imageResponse.json()) as Array<{ imageUrl?: string; imageAlt?: string }>;
  const image = images[0];
  return image?.imageUrl
    ? {
        type: "image",
        imageUrl: image.imageUrl,
        capybaraImage: image.imageUrl,
        capybaraImageAlt: image.imageAlt || "Capybara",
      }
    : null;
};

const searchCuteAnimalFallback = async (signal?: AbortSignal): Promise<ResolvedSlideMedia | null> => {
  const response = await fetch("/api/fetch-pexels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords: ["cute animals"], type: "animal", orientation: "landscape", size: "medium" }),
    signal,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { images?: string[] };
  const imageUrl = data.images?.[0];
  return imageUrl ? { type: "image", imageUrl, capybaraImage: imageUrl, capybaraImageAlt: "Cute animal" } : null;
};

const getFallbackMedia = () => {
  const fallbackImage = getFallbackImage();
  return {
    type: "image" as const,
    imageUrl: fallbackImage,
    capybaraImage: fallbackImage,
    capybaraImageAlt: "Capybara",
  };
};

const resetBookMediaState = () => {
  mediaResultCache.clear();
  giphyUsed = 0;
};

const buildMediaPlan = (
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
): SlideMediaPlan => {
  const isContextSlide = shouldUseContextMedia(slideIndex, totalSlides);
  const contextualKeywords = slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text);
  const contextualQuery = contextualKeywords.join(" ") || normalizeText(slide.text) || "cute animals";
  const capybaraQuery = pickCapybaraQuery(slide);
  const plan: SlideMediaPlan = isContextSlide
    ? {
        type: "giphy",
        query: contextualQuery,
      }
    : {
        type: "pexels",
        query: capybaraQuery,
      };

  if (plan.type === "giphy" && giphyUsed >= MAX_GIPHY) {
    return {
      type: "pexels",
      query: capybaraQuery,
    };
  }

  return plan;
};

const preloadSlideMedia = async (
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  signal?: AbortSignal,
): Promise<ResolvedSlideMedia> => {
  if (signal?.aborted) {
    throw createAbortError();
  }

  const plan = buildMediaPlan(slide, slideIndex, totalSlides);
  const keywords = slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text);

  if (process.env.NODE_ENV === "development") {
    console.log("[MEDIA] preload:", slideIndex, plan.type);
  }

  if (plan.type === "giphy") {
    giphyUsed += 1;
    const giphyResult = await withTimeout(searchGiphyMeaning(plan.query, signal), MEDIA_TIMEOUT_MS);
    if (giphyResult) {
      return giphyResult;
    }
  }

  if (plan.type === "pexels" || plan.type === "giphy") {
    const pexelsResult = await withTimeout(searchPexelsMeaning(plan.query, keywords, signal), MEDIA_TIMEOUT_MS);
    if (pexelsResult) {
      return pexelsResult;
    }
  }

  const capybaraResult = await withTimeout(searchCapybaraFallback({ ...slide, keywords }, signal), MEDIA_TIMEOUT_MS);
  if (capybaraResult) {
    return capybaraResult;
  }

  const animalResult = await withTimeout(searchCuteAnimalFallback(signal), MEDIA_TIMEOUT_MS);
  if (animalResult) {
    return animalResult;
  }

  return getFallbackMedia();
};

const prepareSlides = (slides: Slide[]) =>
  slides.map((slide, index) => ({
    ...slide,
    id: slide.id ?? `slide-${index}`,
    keywords: shouldUseContextMedia(index, slides.length)
      ? (slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text))
      : undefined,
  }));

const createDefaultBookUiState = (): BookUiState => ({
  modeId: null,
  slideIndex: 0,
  showQuiz: false,
});

const clampSlideIndex = (slideIndex: number, slides: Slide[]) => {
  if (slides.length === 0) {
    return 0;
  }

  return Math.max(0, Math.min(slideIndex, slides.length - 1));
};

export function useBook(t: CapybaraPageDict, lang: Lang, options?: UseBookOptions) {
  const requestRef = useRef(0);
  const didInitialLoadRef = useRef(false);
  const appliedInitialBookKeyRef = useRef<string | null>(null);
  const lastLoadedBookRef = useRef<string | null>(null);
  const lastTestsBookRef = useRef<string | null>(null);
  const slidesRef = useRef<Slide[]>([]);
  const mediaCacheRef = useRef<Map<number, ResolvedSlideMedia>>(new Map());
  const modesRequestRef = useRef<Promise<ExplanationMode[]> | null>(null);
  const explanationRequestRef = useRef<Map<string, Promise<BookExplanation>>>(new Map());
  const testsRequestRef = useRef<Map<string, Promise<BookTest[]>>>(new Map());
  const slideMediaInFlightRef = useRef<Set<number>>(new Set());
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [tests, setTests] = useState<BookTest[]>([]);
  const [explanationModes, setExplanationModes] = useState<ExplanationMode[]>([]);
  const [bookHistory, setBookHistory] = useState<BookHistoryEntry[]>([]);
  const [bookUiStateById, setBookUiStateById] = useState<Record<string, BookUiState>>({});
  const [loading, setLoading] = useState(() => !options?.disableInitialRandom || Boolean(options?.initialBook));
  const [error, setError] = useState<string | null>(null);
  const [quizError, setQuizError] = useState(false);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const clearMediaCache = useCallback(() => {
    mediaCacheRef.current = new Map();
    slideMediaInFlightRef.current.clear();
    resetBookMediaState();
  }, []);

  const updateBookUiState = useCallback((
    bookId: string | number,
    updater: (prev: BookUiState) => BookUiState,
  ) => {
    const bookKey = String(bookId);
    setBookUiStateById((prev) => ({
      ...prev,
      [bookKey]: updater(prev[bookKey] || createDefaultBookUiState()),
    }));
  }, []);

  const currentBookKey = currentBook ? String(currentBook.id) : null;
  const currentBookUiState = currentBookKey
    ? (bookUiStateById[currentBookKey] || createDefaultBookUiState())
    : createDefaultBookUiState();
  const selectedModeId = currentBookUiState.modeId;
  const selectedModeIdKey = selectedModeId == null ? "" : String(selectedModeId);

  const preloadInitialSlideMedia = useCallback(async (
    nextSlides: Slide[],
    slideIndex: number,
    signal?: AbortSignal,
  ) => {
    if (!nextSlides[slideIndex]) {
      return new Map<number, ResolvedSlideMedia>();
    }

    if (slideMediaInFlightRef.current.has(slideIndex)) {
      return new Map<number, ResolvedSlideMedia>();
    }

    slideMediaInFlightRef.current.add(slideIndex);

    try {
      const initialMedia = await preloadSlideMedia(nextSlides[slideIndex], slideIndex, nextSlides.length, signal);
      mediaCacheRef.current = new Map<number, ResolvedSlideMedia>([[slideIndex, initialMedia]]);
      return new Map<number, ResolvedSlideMedia>([[slideIndex, initialMedia]]);
    } finally {
      slideMediaInFlightRef.current.delete(slideIndex);
    }
  }, []);

  const preloadNextSlideMedia = useCallback(async (activeIndex: number) => {
    const nextIndex = activeIndex + 1;
    const nextSlide = slidesRef.current[nextIndex];
    if (!nextSlide || mediaCacheRef.current.has(nextIndex) || slideMediaInFlightRef.current.has(nextIndex)) {
      if (process.env.NODE_ENV === "development" && nextSlide) {
        console.log("[GUARD] skip preload (already loaded):", nextIndex);
      }
      return;
    }

    try {
      slideMediaInFlightRef.current.add(nextIndex);
      const media = await preloadSlideMedia(nextSlide, nextIndex, slidesRef.current.length);
      if (!mediaCacheRef.current.has(nextIndex)) {
        const nextCache = new Map(mediaCacheRef.current);
        nextCache.set(nextIndex, media);
        mediaCacheRef.current = nextCache;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error("[MEDIA ERROR]:", error);
    } finally {
      slideMediaInFlightRef.current.delete(nextIndex);
    }
  }, []);

  const loadModes = useCallback(async () => {
    if (explanationModes.length > 0) {
      return explanationModes;
    }

    if (modesRequestRef.current) {
      return modesRequestRef.current;
    }

    const request = (async () => {
      const { data, error: modesError } = await supabase
        .from("explanation_modes")
        .select("*");

      if (modesError) {
        throw modesError;
      }

      const modes = (data || []) as ExplanationMode[];
      setExplanationModes(modes);
      return modes;
    })();

    modesRequestRef.current = request;
    try {
      return await request;
    } finally {
      modesRequestRef.current = null;
    }
  }, [explanationModes]);

  const fetchExplanation = useCallback(async (
    bookId: string | number,
    modeId: string | number,
    signal?: AbortSignal,
  ) => {
    const cacheKey = `${String(bookId)}:${String(modeId)}:${lang}`;
    const cachedRequest = explanationRequestRef.current.get(cacheKey);
    if (cachedRequest) {
      return cachedRequest;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[EXPLANATION] fetch:", bookId, modeId);
    }

    const request = (async () => {
      const response = await fetch(`/api/books/explanation?book_id=${bookId}&mode_id=${modeId}&lang=${lang}`, { signal });
      if (!response.ok) {
        throw new Error(t.errors.explanationLoad);
      }

      return (await response.json()) as BookExplanation;
    })();

    explanationRequestRef.current.set(cacheKey, request);
    try {
      return await request;
    } finally {
      explanationRequestRef.current.delete(cacheKey);
    }
  }, [lang, t.errors.explanationLoad]);

  const loadExplanation = useCallback(
    async (bookId: string | number, modeId: string | number) => {
      const nextModeIdKey = String(modeId);
      if (
        currentBook &&
        String(currentBook.id) === String(bookId) &&
        selectedModeIdKey === nextModeIdKey &&
        slidesRef.current.length > 0
      ) {
        return;
      }

      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);
      clearMediaCache();
      try {
        const explanation = await fetchExplanation(bookId, modeId);
        const nextSlides = prepareSlides(explanation.slides || []);
        await preloadInitialSlideMedia(nextSlides, 0);
        if (requestId !== requestRef.current) {
          return;
        }
        setSlides(nextSlides);
        updateBookUiState(bookId, (prev) => ({
          ...prev,
          modeId,
          slideIndex: 0,
        }));
      } catch (loadError) {
        if (isAbortError(loadError)) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : t.errors.explanationGeneric;
        setSlides([]);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [clearMediaCache, currentBook, fetchExplanation, preloadInitialSlideMedia, selectedModeIdKey, t.errors.explanationGeneric, updateBookUiState],
  );

  const fetchTests = useCallback(async (bookId: string | number, signal?: AbortSignal) => {
    const cacheKey = String(bookId);
    const cachedRequest = testsRequestRef.current.get(cacheKey);
    if (cachedRequest) {
      return cachedRequest;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[QUIZ] fetch start:", bookId);
    }

    const request = (async () => {
      const response = await fetch(`/api/books/tests?book_id=${bookId}`, { signal });
      if (!response.ok) {
        throw new Error(t.errors.testsLoad);
      }

      const data = (await response.json()) as BookTest[];
      if (process.env.NODE_ENV === "development") {
        console.log("[QUIZ] fetch result:", data.length);
      }
      return data;
    })();

    testsRequestRef.current.set(cacheKey, request);
    try {
      return await request;
    } finally {
      testsRequestRef.current.delete(cacheKey);
    }
  }, [t.errors.testsLoad]);

  const loadTests = useCallback(async (bookId: string | number) => {
    const nextTests = await fetchTests(bookId);
    setTests(nextTests);
    return nextTests;
  }, [fetchTests]);

  const hydrateBook = useCallback(
    async (
      book: Book,
      preferredModeId: string | number | null | undefined,
      requestId: number,
      signal?: AbortSignal,
    ) => {
      if (signal?.aborted) {
        throw createAbortError();
      }

      const modes = explanationModes.length > 0 ? explanationModes : await loadModes();
      const getPlotModeId = (modes: ExplanationMode[]) => {
        const match = modes.find((mode) => {
          const label = getModeLabel(mode).toLowerCase();
          return (
            label.includes("plot") ||
            label.includes("сюжет") ||
            label.includes("story")
          );
        });
        return match?.id;
      };
      const fallbackModeId =
        preferredModeId ||
        getPlotModeId(modes) ||
        modes[0]?.id;

      if (!fallbackModeId) {
        throw new Error(t.errors.noModes);
      }

      let explanation: BookExplanation | null = null;
      let resolvedModeId: string | number = fallbackModeId;

      try {
        explanation = await fetchExplanation(book.id, fallbackModeId, signal);
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        for (const mode of modes) {
          try {
            explanation = await fetchExplanation(book.id, mode.id, signal);
            resolvedModeId = mode.id;
            break;
          } catch (modeError) {
            if (isAbortError(modeError)) {
              throw modeError;
            }
            continue;
          }
        }
      }

      if (!explanation) {
        throw new Error(t.errors.noExplanations);
      }

      const nextTests = await fetchTests(book.id, signal).catch((err) => {
        console.error("[QUIZ ERROR]:", err);
        setQuizError(true);
        return [];
      });

      if (requestId !== requestRef.current) {
        return null;
      }

      return {
        nextSlides: prepareSlides(explanation.slides || []),
        nextTests: (nextTests || []) as BookTest[],
        resolvedModeId,
      };
    },
    [explanationModes, fetchExplanation, fetchTests, loadModes, t.errors.noExplanations, t.errors.noModes],
  );

  const loadBook = useCallback(
    async (
      book: Book,
      preferredModeId?: string | number | null,
      options?: LoadBookOptions,
    ) => {
      const bookKey = String(book.id);
      const isBookChange = currentBookKey !== bookKey;

      if (
        lastLoadedBookRef.current === bookKey &&
        currentBookKey === bookKey &&
        slidesRef.current.length > 0
      ) {
        if (process.env.NODE_ENV === "development") {
          console.log("[GUARD] skip loadBook (same book):", book.id);
        }
        return;
      }

      const effectivePreferredModeId = preferredModeId ?? bookUiStateById[bookKey]?.modeId ?? null;
      const requestId = ++requestRef.current;
      lastLoadedBookRef.current = bookKey;
      if (process.env.NODE_ENV === "development") {
        console.log("[BOOK] load start:", book.id);
      }
      const previousEntry = options?.pushHistory !== false && currentBook
        ? {
            book: currentBook,
            slides,
            tests,
          }
        : null;

      setLoading(true);
      setError(null);
      setQuizError(false);
      clearMediaCache();
      setCurrentBook(book);
      if (isBookChange) {
        setSlides([]);
        if (lastTestsBookRef.current !== bookKey) {
          setTests([]);
        }
      }

      try {
        const hydrated = await hydrateBook(book, effectivePreferredModeId, requestId, options?.signal);
        if (!hydrated || requestId !== requestRef.current) {
          return;
        }

        const previousUiState = bookUiStateById[bookKey] || createDefaultBookUiState();
        const nextSlideIndex = clampSlideIndex(previousUiState.slideIndex, hydrated.nextSlides);
        await preloadInitialSlideMedia(hydrated.nextSlides, nextSlideIndex, options?.signal);
        if (requestId !== requestRef.current) {
          return;
        }

        setSlides(hydrated.nextSlides);
        if (lastTestsBookRef.current !== bookKey) {
          setTests(hydrated.nextTests);
          lastTestsBookRef.current = bookKey;
        }
        if (process.env.NODE_ENV === "development") {
          console.log("[BOOK] load success:", book.id);
        }
        updateBookUiState(book.id, (prev) => ({
          ...prev,
          modeId: prev.modeId ?? hydrated.resolvedModeId,
          slideIndex: clampSlideIndex(prev.slideIndex, hydrated.nextSlides),
        }));
        if (previousEntry) {
          setBookHistory((prev) => [...prev, previousEntry]);
        }
      } catch (loadError) {
        if (requestId !== requestRef.current) {
          return;
        }

        if (isAbortError(loadError)) {
          return;
        }

        setCurrentBook(null);
        setSlides([]);
        setTests([]);
        lastLoadedBookRef.current = null;
        lastTestsBookRef.current = null;
        setError(loadError instanceof Error ? loadError.message : t.errors.bookLoad);
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      }
    },
    [bookUiStateById, clearMediaCache, currentBook, currentBookKey, hydrateBook, preloadInitialSlideMedia, slides, t.errors.bookLoad, tests, updateBookUiState],
  );

  const loadRandomBook = useCallback(
    async (preferredModeId?: string | number | null) => {
      setLoading(true);
      setError(null);

      try {
        const bookResponse = await fetch("/api/books/random");

        if (!bookResponse.ok) {
          throw new Error(t.errors.randomBookLoad);
        }

        const book = (await bookResponse.json()) as Book;
        await loadBook(book, preferredModeId);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.message === t.errors.randomBookLoad) {
          setError(loadError.message);
          setLoading(false);
        }
      }
    },
    [loadBook, t.errors.randomBookLoad],
  );

  const loadPreviousBook = useCallback(async () => {
    const previousEntry = bookHistory[bookHistory.length - 1];
    if (!previousEntry) {
      return;
    }

    requestRef.current += 1;
    clearMediaCache();
    const previousUiState = bookUiStateById[String(previousEntry.book.id)] || createDefaultBookUiState();
    const nextSlideIndex = clampSlideIndex(previousUiState.slideIndex, previousEntry.slides);
    const nextMediaCache = await preloadInitialSlideMedia(previousEntry.slides, nextSlideIndex);

    setLoading(false);
    setError(null);
    setCurrentBook(previousEntry.book);
    setSlides(previousEntry.slides);
    setTests(previousEntry.tests);
    mediaCacheRef.current = nextMediaCache;
    lastLoadedBookRef.current = String(previousEntry.book.id);
    lastTestsBookRef.current = String(previousEntry.book.id);
    setBookHistory((prev) => prev.slice(0, -1));
  }, [bookHistory, bookUiStateById, clearMediaCache, preloadInitialSlideMedia]);

  const setCurrentBookSlideIndex = useCallback((slideIndex: number) => {
    if (!currentBook) {
      return;
    }

    updateBookUiState(currentBook.id, (prev) => ({
      ...prev,
      slideIndex,
    }));
  }, [currentBook, updateBookUiState]);

  const toggleCurrentBookQuiz = useCallback(() => {
    if (!currentBook) {
      return;
    }

    updateBookUiState(currentBook.id, (prev) => ({
      ...prev,
      showQuiz: !prev.showQuiz,
    }));
  }, [currentBook, updateBookUiState]);

  const closeCurrentBookQuiz = useCallback(() => {
    if (!currentBook) {
      return;
    }

    updateBookUiState(currentBook.id, (prev) => ({
      ...prev,
      showQuiz: false,
    }));
  }, [currentBook, updateBookUiState]);

  useEffect(() => {
    if (!options?.initialBook) {
      return;
    }

    const nextInitialBookKey = `${String(options.initialBook.id)}:${String(options.initialModeId ?? "")}`;
    if (appliedInitialBookKeyRef.current === nextInitialBookKey) {
      return;
    }

    appliedInitialBookKeyRef.current = nextInitialBookKey;
    didInitialLoadRef.current = true;
    void loadBook(options.initialBook, options.initialModeId, { pushHistory: false });
  }, [loadBook, options?.initialBook, options?.initialModeId]);

  useEffect(() => {
    if (didInitialLoadRef.current || options?.initialBook) {
      return;
    }

    if (!options?.disableInitialRandom) {
      didInitialLoadRef.current = true;
      void loadRandomBook();
      return;
    }

    didInitialLoadRef.current = true;
    setLoading(false);
  }, [loadRandomBook, options?.disableInitialRandom, options?.initialBook]);
  return {
    currentBook,
    slides,
    tests,
    explanationModes,
    selectedModeId,
    currentSlideIndex: currentBookUiState.slideIndex,
    showQuiz: currentBookUiState.showQuiz,
    loading,
    error,
    quizError,
    loadRandomBook,
    loadBook,
    loadPreviousBook,
    loadExplanation,
    loadTests,
    preloadNextSlideMedia,
    setCurrentBookSlideIndex,
    toggleCurrentBookQuiz,
    closeCurrentBookQuiz,
    mediaCache: mediaCacheRef.current,
    hasPreviousBook: bookHistory.length > 0,
    meaningModeId: getMeaningModeId(explanationModes),
  };
}
