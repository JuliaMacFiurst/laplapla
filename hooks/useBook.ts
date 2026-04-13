import { useCallback, useEffect, useRef, useState } from "react";
import { fallbackImages } from "@/constants";
import { buildSlideMediaQueries, findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";
import { buildStudioSlidesFromCapybaraSlides } from "@/lib/capybaraStudioSlides";
import type { dictionaries, Lang } from "@/i18n";
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
  forceReload?: boolean;
  preserveMediaCache?: boolean;
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

type LibrarySearchItem = {
  url: string;
  mediaType: "gif" | "image" | "video";
};

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

const MEDIA_TIMEOUT_MS = 5000;
const PRELOAD_AHEAD_COUNT = 4;
const MAX_BOOK_MEDIA_QUERY_LENGTH = 120;
const GIPHY_FALLBACK_QUERIES = ["nature", "landscape", "animals", "travel"];
const PEXELS_FALLBACK_QUERIES = ["nature", "landscape", "travel", "wildlife"];

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

const clampMediaQuery = (value: string, maxLength = MAX_BOOK_MEDIA_QUERY_LENGTH) =>
  value
    .trim()
    .slice(0, maxLength)
    .trim();

const buildFallbackQueries = (query: string, fallbackQueries: string[]) =>
  Array.from(
    new Set(
      [clampMediaQuery(query), ...fallbackQueries.map((item) => clampMediaQuery(item))]
        .filter(Boolean),
    ),
  );

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

const pickSeededItem = <T extends { url: string }>(
  items: T[],
  excludedUrls: string[],
  seed: string,
) => {
  const candidates = items.filter((item) => item.url && !excludedUrls.includes(item.url));
  if (candidates.length === 0) {
    return null;
  }

  const pool = candidates.slice(0, Math.min(candidates.length, 6));
  const index = hashString(seed) % pool.length;
  return pool[index] || pool[0] || null;
};

const getRequiredCapybaraCount = (totalSlides: number) => {
  if (totalSlides >= 9) {
    return 4;
  }
  if (totalSlides >= 5) {
    return 3;
  }
  return Math.min(2, totalSlides);
};

const getCapybaraAnchorIndices = (totalSlides: number) => {
  const count = getRequiredCapybaraCount(totalSlides);
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [0];
  }

  return Array.from(new Set(
    Array.from({ length: count }, (_, index) =>
      Math.round((index * Math.max(totalSlides - 1, 0)) / Math.max(count - 1, 1)),
    ),
  ));
};

const shouldPreferCapybaraMedia = (slideIndex: number, totalSlides: number) =>
  getCapybaraAnchorIndices(totalSlides).includes(slideIndex);

const shouldUseContextMedia = (slideIndex: number, totalSlides: number) =>
  slideIndex === 0 ||
  slideIndex === Math.floor(totalSlides / 2) ||
  slideIndex === totalSlides - 1;

const pickCapybaraQuery = (slide: Slide) => {
  const seed = hashString(buildSlideCacheKey(slide));
  return capybaraQueries[seed % capybaraQueries.length];
};

const buildContextualQueryVariants = (slide: Slide) => {
  const normalizedText = normalizeText(slide.text);
  const keywords = slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text);
  const keywordPhrase = keywords.join(" ").trim();
  const firstKeyword = keywords[0] || "";
  const firstTwoKeywords = keywords.slice(0, 2).join(" ").trim();

  return unique([
    clampMediaQuery(keywordPhrase),
    clampMediaQuery(firstTwoKeywords),
    clampMediaQuery(firstKeyword),
    clampMediaQuery(normalizedText),
  ]).filter(Boolean);
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

const searchLibraryItems = async (
  endpoint: "/api/giphy" | "/api/pexels",
  query: string,
  signal?: AbortSignal,
  limit = 10,
): Promise<LibrarySearchItem[]> => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, limit }),
    signal,
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { items?: LibrarySearchItem[] };
  return Array.isArray(data.items)
    ? data.items.filter((item): item is LibrarySearchItem => Boolean(item?.url && item?.mediaType))
    : [];
};

const searchGiphyMeaning = async (
  query: string,
  seed: string,
  excludedUrls: string[] = [],
  signal?: AbortSignal,
): Promise<ResolvedSlideMedia | null> => {
  const normalizedQueries = buildFallbackQueries(query, GIPHY_FALLBACK_QUERIES);
  const cacheKey = `giphy:${normalizedQueries.join("|")}:${excludedUrls.join("|")}`;
  const cached = mediaResultCache.get(cacheKey);
  if (cached) {
    if (process.env.NODE_ENV === "development") {
      console.log("[MEDIA] cache hit:", cacheKey);
    }
    return cached;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[MEDIA] preload:", normalizedQueries[0], "giphy");
  }
  const excluded = new Set(excludedUrls.filter(Boolean));
  let result: ResolvedSlideMedia | null = null;

  for (const currentQuery of normalizedQueries) {
    const items = await searchLibraryItems("/api/giphy", currentQuery, signal);
    const picked = pickSeededItem(
      items.filter((item) => item.mediaType === "gif"),
      Array.from(excluded),
      `${seed}:${currentQuery}`,
    );
    if (picked?.url) {
      result = { type: "gif" as const, gifUrl: picked.url };
      break;
    }
  }

  if (result) {
    mediaResultCache.set(cacheKey, result);
  }
  return result;
};

const searchPexelsMeaning = async (
  query: string,
  seed: string,
  keywords?: string[],
  excludedUrls: string[] = [],
  signal?: AbortSignal,
): Promise<ResolvedSlideMedia | null> => {
  const normalizedKeywords = keywords?.length ? keywords : query.split(" ").filter(Boolean);
  const excluded = new Set(excludedUrls.filter(Boolean));
  const queries = buildFallbackQueries(query, PEXELS_FALLBACK_QUERIES);

  for (const currentQuery of queries) {
    const items = await searchLibraryItems("/api/pexels", currentQuery, signal);

    const image = pickSeededItem(
      items.filter((item) => item.mediaType === "image"),
      Array.from(excluded),
      `${seed}:image:${currentQuery}`,
    );
    if (image?.url) {
      return {
        type: "image",
        imageUrl: image.url,
        capybaraImage: image.url,
      };
    }

    const video = pickSeededItem(
      items.filter((item) => item.mediaType === "video"),
      Array.from(excluded),
      `${seed}:video:${currentQuery}`,
    );
    if (video?.url) {
      return {
        type: "video",
        videoUrl: video.url,
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
  const imageUrl = pickSeededItem(
    (imageData.images || []).filter(Boolean).map((url) => ({ url })),
    Array.from(excluded),
    `${seed}:fetch-pexels`,
  )?.url;
  return imageUrl ? { type: "image", imageUrl, capybaraImage: imageUrl } : null;
};

const resolveCandidateToMedia = (candidate: Awaited<ReturnType<typeof findAlternativeSlideMedia>>): ResolvedSlideMedia | null => {
  if (!candidate) {
    return null;
  }

  if (candidate.mediaType === "video") {
    return {
      type: "video",
      videoUrl: candidate.url,
    };
  }

  if (candidate.mediaType === "gif") {
    return {
      type: "gif",
      gifUrl: candidate.url,
    };
  }

  return {
    type: "image",
    imageUrl: candidate.url,
    capybaraImage: candidate.url,
  };
};

const searchPrimarySlideMedia = async (
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  excludedUrls: string[] = [],
): Promise<ResolvedSlideMedia | null> => {
  const contextualVariants = buildContextualQueryVariants(slide);
  const queries = [
    ...buildSlideMediaQueries(...contextualVariants),
    ...contextualVariants,
  ].filter(Boolean);

  const preferredSources =
    shouldUseContextMedia(slideIndex, totalSlides) && giphyUsed < MAX_GIPHY
      ? ["giphy", "pexels"] as const
      : ["pexels", "giphy"] as const;

  const candidate = await findAlternativeSlideMedia({
    queries,
    excludedUrls,
    preferredSources: [...preferredSources],
  });

  if (candidate?.mediaType === "gif") {
    giphyUsed += 1;
  }

  return resolveCandidateToMedia(candidate);
};

const searchCapybaraFallback = async (
  slide: Slide,
  excludedUrls: string[] = [],
  signal?: AbortSignal,
): Promise<ResolvedSlideMedia | null> => {
  const excluded = new Set(excludedUrls.filter(Boolean));
  const gifResponse = await fetch(buildMediaUrl("/api/capybara-gifs", slide), { signal });
  if (gifResponse.ok) {
    const gifs = (await gifResponse.json()) as Array<{ gifUrl?: string }>;
    const gifUrl = gifs.find((item) => item.gifUrl && !excluded.has(item.gifUrl))?.gifUrl;
    if (gifUrl) {
      return { type: "gif", gifUrl };
    }
  }

  const imageResponse = await fetch(buildMediaUrl("/api/capybara-images", slide), { signal });
  if (!imageResponse.ok) {
    return null;
  }

  const images = (await imageResponse.json()) as Array<{ imageUrl?: string; imageAlt?: string }>;
  const image = images.find((item) => item.imageUrl && !excluded.has(item.imageUrl));
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

const FIRST_SLIDE_MEMORY_LIMIT = 10;

const getPrimaryMediaUrl = (media: ResolvedSlideMedia | null | undefined) =>
  media?.videoUrl || media?.gifUrl || media?.imageUrl || media?.capybaraImage || "";

const buildMediaPlan = (
  slide: Slide | undefined,
  slideIndex: number,
  totalSlides: number,
): SlideMediaPlan => {
  if (!slide) {
    return {
      type: "fallback",
      query: "capybara",
    };
  }

  const isContextSlide = shouldUseContextMedia(slideIndex, totalSlides);
  const prefersCapybaraMedia = shouldPreferCapybaraMedia(slideIndex, totalSlides);
  const contextualKeywords = slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text);
  const contextualQuery = clampMediaQuery(
    contextualKeywords.join(" ") || normalizeText(slide.text) || "nature",
  );
  const capybaraQuery = clampMediaQuery(pickCapybaraQuery(slide));
  if (prefersCapybaraMedia) {
    return {
      type: "giphy",
      query: capybaraQuery,
    };
  }
  const plan: SlideMediaPlan = isContextSlide
    ? {
        type: "giphy",
        query: contextualQuery,
      }
    : {
        type: "pexels",
        query: contextualQuery,
      };

  if (plan.type === "giphy" && giphyUsed >= MAX_GIPHY) {
    return {
      type: "pexels",
      query: contextualQuery || capybaraQuery,
    };
  }

  return plan;
};

const getUsedMediaUrls = (usedMediaUrls: string[]) =>
  Array.from(new Set(usedMediaUrls.filter(Boolean)));

const collectResolvedMediaUrls = (entries: Iterable<ResolvedSlideMedia>) =>
  Array.from(entries).flatMap((entry) =>
    [entry.videoUrl, entry.gifUrl, entry.imageUrl, entry.capybaraImage].filter(Boolean) as string[],
  );

const getPreloadIndices = (activeIndex: number, totalSlides: number, count: number) => {
  const indices: number[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const index = activeIndex + offset;
    if (index >= 0 && index < totalSlides) {
      indices.push(index);
    }
  }

  return indices;
};

const preloadSlideMedia = async (
  slide: Slide | undefined,
  slideIndex: number,
  totalSlides: number,
  usedMediaUrls: string[] = [],
  recentFirstSlideMediaUrls: string[] = [],
  signal?: AbortSignal,
): Promise<ResolvedSlideMedia> => {
  if (signal?.aborted) {
    throw createAbortError();
  }

  if (!slide) {
    return getFallbackMedia();
  }

  const plan = buildMediaPlan(slide, slideIndex, totalSlides);
  const keywords = slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text);
  const excludedUrls = getUsedMediaUrls([
    ...usedMediaUrls,
    ...(slideIndex === 0 ? recentFirstSlideMediaUrls : []),
  ]);
  const seed = buildSlideCacheKey(slide);
  const capybaraQuery = clampMediaQuery(pickCapybaraQuery(slide));
  const prefersCapybaraMedia = shouldPreferCapybaraMedia(slideIndex, totalSlides);

  if (process.env.NODE_ENV === "development") {
    console.log("[MEDIA] preload:", slideIndex, plan.type);
  }

  if (prefersCapybaraMedia) {
    const capybaraFirstResult = await withTimeout(
      searchCapybaraFallback(
        {
          ...slide,
          keywords: [capybaraQuery],
        },
        excludedUrls,
        signal,
      ),
      MEDIA_TIMEOUT_MS,
    );

    if (capybaraFirstResult) {
      return capybaraFirstResult;
    }
  }

  const primaryResult = await withTimeout(
    searchPrimarySlideMedia(slide, slideIndex, totalSlides, excludedUrls),
    MEDIA_TIMEOUT_MS,
  );
  if (primaryResult) {
    return primaryResult;
  }

  const giphyPromise =
    plan.type === "giphy"
      ? withTimeout(searchGiphyMeaning(plan.query, seed, excludedUrls, signal), MEDIA_TIMEOUT_MS)
      : Promise.resolve<ResolvedSlideMedia | null>(null);
  const pexelsPromise =
    plan.type === "pexels" || plan.type === "giphy"
      ? withTimeout(searchPexelsMeaning(plan.query, seed, keywords, excludedUrls, signal), MEDIA_TIMEOUT_MS)
      : Promise.resolve<ResolvedSlideMedia | null>(null);

  const [giphyResult, pexelsResult] = await Promise.all([giphyPromise, pexelsPromise]);

  if (giphyResult) {
    giphyUsed += 1;
    return giphyResult;
  }

  if (pexelsResult) {
    return pexelsResult;
  }

  const capybaraResult = await withTimeout(searchCapybaraFallback({ ...slide, keywords }, excludedUrls, signal), MEDIA_TIMEOUT_MS);
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
  const recentFirstSlideMediaUrlsRef = useRef<string[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [mediaCache, setMediaCache] = useState<ReadonlyMap<number, ResolvedSlideMedia>>(new Map());
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
    const nextCache = new Map<number, ResolvedSlideMedia>();
    mediaCacheRef.current = nextCache;
    setMediaCache(nextCache);
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

    const preloadIndices = getPreloadIndices(slideIndex, nextSlides.length, PRELOAD_AHEAD_COUNT)
      .filter((index) => Boolean(nextSlides[index]) && !slideMediaInFlightRef.current.has(index));

    if (preloadIndices.length === 0) {
      return new Map<number, ResolvedSlideMedia>();
    }

    preloadIndices.forEach((index) => {
      slideMediaInFlightRef.current.add(index);
    });

    try {
      const nextCache = new Map<number, ResolvedSlideMedia>();

      for (const index of preloadIndices) {
        try {
          const media = await preloadSlideMedia(
            nextSlides[index],
            index,
            nextSlides.length,
            collectResolvedMediaUrls(nextCache.values()),
            recentFirstSlideMediaUrlsRef.current,
            signal,
          );
          nextCache.set(index, media);
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }
          console.error("[MEDIA INIT ERROR]:", error);
        }
      }

      mediaCacheRef.current = nextCache;
      setMediaCache(nextCache);
      return nextCache;
    } finally {
      preloadIndices.forEach((index) => {
        slideMediaInFlightRef.current.delete(index);
      });
    }
  }, []);

  const rememberFirstSlideMedia = useCallback((cache: ReadonlyMap<number, ResolvedSlideMedia>) => {
    const firstUrl = getPrimaryMediaUrl(cache.get(0));
    if (!firstUrl) {
      return;
    }

    recentFirstSlideMediaUrlsRef.current = [
      ...recentFirstSlideMediaUrlsRef.current.filter((url) => url !== firstUrl),
      firstUrl,
    ].slice(-FIRST_SLIDE_MEMORY_LIMIT);
  }, []);

  const preloadNextSlideMedia = useCallback(async (activeIndex: number) => {
    const preloadIndices = getPreloadIndices(activeIndex + 1, slidesRef.current.length, PRELOAD_AHEAD_COUNT - 1)
      .filter((index) => {
        const slide = slidesRef.current[index];
        if (!slide) {
          return false;
        }
        return !mediaCacheRef.current.has(index) && !slideMediaInFlightRef.current.has(index);
      });

    if (preloadIndices.length === 0) {
      return;
    }

    preloadIndices.forEach((index) => {
      slideMediaInFlightRef.current.add(index);
    });

    try {
      const nextCache = new Map(mediaCacheRef.current);

      for (const index of preloadIndices) {
        try {
          const media = await preloadSlideMedia(
            slidesRef.current[index],
            index,
            slidesRef.current.length,
            collectResolvedMediaUrls(nextCache.values()),
            recentFirstSlideMediaUrlsRef.current,
          );
          if (!nextCache.has(index)) {
            nextCache.set(index, media);
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
          console.error("[MEDIA ERROR]:", error);
        }
      }

      mediaCacheRef.current = nextCache;
      setMediaCache(nextCache);
    } finally {
      preloadIndices.forEach((index) => {
        slideMediaInFlightRef.current.delete(index);
      });
    }
  }, []);

  const buildStudioSlides = useCallback(async () => {
    const nextSlides = slidesRef.current;
    const nextCache = new Map(mediaCacheRef.current);

    for (let index = 0; index < nextSlides.length; index += 1) {
      if (nextCache.has(index)) {
        continue;
      }

      try {
        const media = await preloadSlideMedia(
          nextSlides[index],
          index,
          nextSlides.length,
          collectResolvedMediaUrls(nextCache.values()),
          recentFirstSlideMediaUrlsRef.current,
        );
        nextCache.set(index, media);
      } catch (error) {
        if (isAbortError(error)) {
          break;
        }
        console.error("[MEDIA EXPORT ERROR]:", error);
      }
    }

    mediaCacheRef.current = nextCache;
    setMediaCache(nextCache);
    return buildStudioSlidesFromCapybaraSlides(nextSlides, nextCache, currentBook
      ? {
          title: String(currentBook.title ?? "").trim(),
          author: currentBook.author,
          year: currentBook.year,
          ageGroup: currentBook.age_group,
        }
      : undefined);
  }, [currentBook]);

  const refreshSlideMedia = useCallback(async (
    slideIndex: number,
    options?: {
      bookTitle?: string;
      modeLabel?: string;
    },
  ) => {
    const slide = slidesRef.current[slideIndex];
    if (!slide) {
      return false;
    }

  const currentMedia = mediaCacheRef.current.get(slideIndex);
    const queries = buildSlideMediaQueries(
      slide.keywords?.join(" "),
      options?.bookTitle,
      options?.modeLabel,
      slide.text,
    );

    const alternative = await findAlternativeSlideMedia({
      queries,
      excludedUrls: [
        currentMedia?.videoUrl,
        currentMedia?.gifUrl,
        currentMedia?.imageUrl,
        currentMedia?.capybaraImage,
      ].filter(Boolean) as string[],
      preferredSources: ["giphy", "pexels"],
    });

    if (!alternative) {
      return false;
    }

    const nextMedia: ResolvedSlideMedia =
      alternative.mediaType === "video"
        ? {
            type: "video",
            videoUrl: alternative.url,
            capybaraImage: currentMedia?.capybaraImage,
          }
        : alternative.mediaType === "gif"
          ? {
              type: "gif",
              gifUrl: alternative.url,
            }
          : {
              type: "image",
              imageUrl: alternative.url,
              capybaraImage: alternative.url,
              capybaraImageAlt: currentMedia?.capybaraImageAlt || "Capybara",
            };

    const nextCache = new Map(mediaCacheRef.current);
    nextCache.set(slideIndex, nextMedia);
    mediaCacheRef.current = nextCache;
    setMediaCache(nextCache);
    return true;
  }, []);

  const loadModes = useCallback(async () => {
    if (explanationModes.length > 0) {
      return explanationModes;
    }

    if (modesRequestRef.current) {
      return modesRequestRef.current;
    }

    const request = (async () => {
      const response = await fetch("/api/books/explanation-modes");
      const data = await response.json().catch(() => null) as ExplanationMode[] | { error?: string } | null;

      if (!response.ok || !Array.isArray(data)) {
        throw new Error(
          !Array.isArray(data) && data?.error
            ? data.error
            : "Failed to load explanation modes",
        );
      }

      const modes = data;
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
        if (nextSlides.length === 0) {
          throw new Error(t.storyError);
        }
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
    [clearMediaCache, currentBook, fetchExplanation, preloadInitialSlideMedia, selectedModeIdKey, t.errors.explanationGeneric, t.storyError, updateBookUiState],
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
      const response = await fetch(`/api/books/tests?book_id=${bookId}&lang=${lang}`, { signal });
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

      const nextSlides = prepareSlides(explanation.slides || []);
      if (nextSlides.length === 0) {
        throw new Error(t.storyError);
      }

      return {
        nextSlides,
        nextTests: (nextTests || []) as BookTest[],
        resolvedModeId,
      };
    },
    [explanationModes, fetchExplanation, fetchTests, loadModes, t.errors.noExplanations, t.errors.noModes, t.storyError],
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
        !options?.forceReload &&
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
      if (!options?.preserveMediaCache) {
        clearMediaCache();
      }
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
        const nextMediaCache = await preloadInitialSlideMedia(hydrated.nextSlides, nextSlideIndex, options?.signal);
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
        rememberFirstSlideMedia(nextMediaCache);
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
    [bookUiStateById, clearMediaCache, currentBook, currentBookKey, hydrateBook, preloadInitialSlideMedia, rememberFirstSlideMedia, slides, t.errors.bookLoad, tests, updateBookUiState],
  );

  const loadRandomBook = useCallback(
    async (preferredModeId?: string | number | null) => {
      setLoading(true);
      setError(null);

      try {
        const bookResponse = await fetch(`/api/books/random?lang=${lang}`);

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
    [lang, loadBook, t.errors.randomBookLoad],
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
    setMediaCache(nextMediaCache);
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
    buildStudioSlides,
    setCurrentBookSlideIndex,
    toggleCurrentBookQuiz,
    closeCurrentBookQuiz,
    mediaCache,
    refreshSlideMedia,
    hasPreviousBook: bookHistory.length > 0,
    meaningModeId: getMeaningModeId(explanationModes),
  };
}
