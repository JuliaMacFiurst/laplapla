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
  selectedModeId: string | number | null;
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

const mediaCache = new Map<string, ResolvedSlideMedia>();
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
  return gifUrl ? { type: "gif", gifUrl } : null;
};

const searchPexelsMeaning = async (query: string, keywords: string[], signal?: AbortSignal): Promise<ResolvedSlideMedia | null> => {
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
    body: JSON.stringify({ keywords, type: "story", orientation: "landscape", size: "medium" }),
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

const resolveSlideMedia = async (
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  signal?: AbortSignal,
): Promise<ResolvedSlideMedia> => {
  const useContextMedia = shouldUseContextMedia(slideIndex, totalSlides);
  const cacheKey = `${useContextMedia ? "context" : "capybara"}:${buildSlideCacheKey(slide)}`;
  const cached = mediaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const contextualKeywords = slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text);
  const contextualQuery = contextualKeywords.join(" ") || normalizeText(slide.text) || "cute animals";
  const capybaraQuery = pickCapybaraQuery(slide);
  const capybaraKeywords = capybaraQuery.split(" ");

  const sources = useContextMedia
    ? [
        () => withTimeout(searchGiphyMeaning(contextualQuery, signal), MEDIA_TIMEOUT_MS),
        () => withTimeout(searchPexelsMeaning(contextualQuery, contextualKeywords, signal), MEDIA_TIMEOUT_MS),
        () => withTimeout(searchCapybaraFallback({ ...slide, keywords: contextualKeywords }, signal), MEDIA_TIMEOUT_MS),
        () => withTimeout(searchCuteAnimalFallback(signal), MEDIA_TIMEOUT_MS),
      ]
    : [
        () => withTimeout(searchGiphyMeaning(capybaraQuery, signal), MEDIA_TIMEOUT_MS),
        () => withTimeout(searchPexelsMeaning(capybaraQuery, capybaraKeywords, signal), MEDIA_TIMEOUT_MS),
        () => withTimeout(searchCapybaraFallback({ ...slide, keywords: capybaraKeywords }, signal), MEDIA_TIMEOUT_MS),
        () => withTimeout(searchCuteAnimalFallback(signal), MEDIA_TIMEOUT_MS),
      ];

  for (const source of sources) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const result = await source();
    if (result) {
      mediaCache.set(cacheKey, result);
      return result;
    }
  }

  const fallbackImage = getFallbackImage();
  const fallbackMedia = {
    type: "image" as const,
    imageUrl: fallbackImage,
    capybaraImage: fallbackImage,
    capybaraImageAlt: "Capybara",
  };
  mediaCache.set(cacheKey, fallbackMedia);
  return fallbackMedia;
};

const prepareSlides = (slides: Slide[]) =>
  slides.map((slide, index) => ({
    ...slide,
    id: slide.id ?? `slide-${index}`,
    keywords: shouldUseContextMedia(index, slides.length)
      ? (slide.keywords?.length ? slide.keywords : extractSlideKeywords(slide.text))
      : undefined,
  }));

export function useBook(t: CapybaraPageDict, lang: Lang) {
  const requestRef = useRef(0);
  const didInitialLoadRef = useRef(false);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [tests, setTests] = useState<BookTest[]>([]);
  const [explanationModes, setExplanationModes] = useState<ExplanationMode[]>([]);
  const [selectedModeId, setSelectedModeId] = useState<string | number | null>(null);
  const [bookHistory, setBookHistory] = useState<BookHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prefetchSlidesWithMedia = useCallback((rawSlides: Slide[], requestId: number, signal?: AbortSignal) => {
    void Promise.allSettled(
      rawSlides.map(async (slide, index) => {
        const media = await resolveSlideMedia(slide, index, rawSlides.length, signal);
        if (signal?.aborted || requestId !== requestRef.current) {
          return;
        }

        setSlides((prev) =>
          prev.map((existingSlide, slideIndex) =>
            slideIndex === index ? { ...existingSlide, ...media } : existingSlide,
          ),
        );
      }),
    );
  }, []);

  const loadModes = useCallback(async () => {
    const { data, error: modesError } = await supabase
      .from("explanation_modes")
      .select("*");

    if (modesError) {
      throw modesError;
    }

    const modes = (data || []) as ExplanationMode[];
    setExplanationModes(modes);
    return modes;
  }, []);

  const fetchExplanation = useCallback(async (
    bookId: string | number,
    modeId: string | number,
    signal?: AbortSignal,
  ) => {
    const response = await fetch(`/api/books/explanation?book_id=${bookId}&mode_id=${modeId}&lang=${lang}`, { signal });
    if (!response.ok) {
      throw new Error(t.errors.explanationLoad);
    }

    return (await response.json()) as BookExplanation;
  }, [lang, t.errors.explanationLoad]);

  const loadExplanation = useCallback(
    async (bookId: string | number, modeId: string | number) => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setError(null);
      try {
        const explanation = await fetchExplanation(bookId, modeId);
        const nextSlides = prepareSlides(explanation.slides || []);
        if (requestId !== requestRef.current) {
          return;
        }
        setSlides(nextSlides);
        prefetchSlidesWithMedia(nextSlides, requestId);
        setSelectedModeId(modeId);
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
    [currentBook?.title, fetchExplanation, prefetchSlidesWithMedia, t.errors.explanationGeneric],
  );

  const fetchTests = useCallback(async (bookId: string | number, signal?: AbortSignal) => {
    const response = await fetch(`/api/books/tests?book_id=${bookId}`, { signal });
    if (!response.ok) {
      throw new Error(t.errors.testsLoad);
    }

    return (await response.json()) as BookTest[];
  }, [t.errors.testsLoad]);

  const loadTests = useCallback(async (bookId: string | number) => {
    const nextTests = await fetchTests(bookId);
    console.log("Normalized quiz:", nextTests);
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

      const nextTests = await fetchTests(book.id, signal).catch(() => []);

      if (requestId !== requestRef.current) {
        return null;
      }

      console.log("Normalized quiz:", nextTests);
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
      const requestId = ++requestRef.current;
      const previousEntry = options?.pushHistory !== false && currentBook
        ? {
            book: currentBook,
            slides,
            tests,
            selectedModeId,
          }
        : null;

      setLoading(true);
      setError(null);
      setCurrentBook(book);
      setSlides([]);
      setTests([]);

      try {
        const hydrated = await hydrateBook(book, preferredModeId, requestId, options?.signal);
        if (!hydrated || requestId !== requestRef.current) {
          return;
        }

        setSlides(hydrated.nextSlides);
        setTests(hydrated.nextTests);
        setSelectedModeId(hydrated.resolvedModeId);
        prefetchSlidesWithMedia(hydrated.nextSlides, requestId, options?.signal);
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
        setSelectedModeId(null);
        setError(loadError instanceof Error ? loadError.message : t.errors.bookLoad);
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      }
    },
    [currentBook, hydrateBook, prefetchSlidesWithMedia, selectedModeId, slides, t.errors.bookLoad, tests],
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

  const loadPreviousBook = useCallback(() => {
    setBookHistory((prev) => {
      const previousEntry = prev[prev.length - 1];
      if (!previousEntry) {
        return prev;
      }

      requestRef.current += 1;
      setLoading(false);
      setError(null);
      setCurrentBook(previousEntry.book);
      setSlides(previousEntry.slides);
      setTests(previousEntry.tests);
      setSelectedModeId(previousEntry.selectedModeId);

      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    if (didInitialLoadRef.current) {
      return;
    }

    didInitialLoadRef.current = true;
    void loadRandomBook();
  }, [loadRandomBook]);

  console.log("tests", tests)

  return {
    currentBook,
    slides,
    tests,
    explanationModes,
    selectedModeId,
    loading,
    error,
    loadRandomBook,
    loadBook,
    loadPreviousBook,
    loadExplanation,
    loadTests,
    hasPreviousBook: bookHistory.length > 0,
    meaningModeId: getMeaningModeId(explanationModes),
  };
}
