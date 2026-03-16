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

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const createAbortError = () => {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
};

const getFallbackImage = () =>
  `/images/capybaras/${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`;

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

const enrichSlidesWithMedia = async (slides: Slide[], signal?: AbortSignal): Promise<Slide[]> => {
  return Promise.all(
    slides.map(async (slide, index) => {
      const [imagesResult, gifsResult, videosResult] = await Promise.allSettled([
        fetch(buildMediaUrl("/api/capybara-images", slide), { signal }).then((response) => response.json()),
        fetch(buildMediaUrl("/api/capybara-gifs", slide), { signal }).then((response) => response.json()),
        fetch(buildMediaUrl("/api/capybara-videos", slide), { signal }).then((response) => response.json()),
      ]);

      if (
        signal?.aborted ||
        [imagesResult, gifsResult, videosResult].some(
          (result) => result.status === "rejected" && isAbortError(result.reason),
        )
      ) {
        throw createAbortError();
      }

      const images = imagesResult.status === "fulfilled" && Array.isArray(imagesResult.value) ? imagesResult.value : [];
      const gifs = gifsResult.status === "fulfilled" && Array.isArray(gifsResult.value) ? gifsResult.value : [];
      const videos = videosResult.status === "fulfilled" && Array.isArray(videosResult.value) ? videosResult.value : [];

      const fallbackImage = getFallbackImage();

      if (videos.length > 0 && index > 0 && index % 3 === 0) {
        return {
          ...slide,
          type: "video" as const,
          videoUrl: videos[0]?.videoUrl,
          capybaraImage: videos[0]?.preview || fallbackImage,
        };
      }

      if (gifs.length > 0 && index % 2 === 1) {
        return {
          ...slide,
          type: "gif" as const,
          gifUrl: gifs[0]?.gifUrl,
          capybaraImage: slide.capybaraImage || fallbackImage,
        };
      }

      if (images.length > 0) {
        return {
          ...slide,
          type: "image" as const,
          capybaraImage: images[0]?.imageUrl,
          capybaraImageAlt: images[0]?.imageAlt || "Capybara",
        };
      }

      return {
        ...slide,
        type: slide.type || "image",
        capybaraImage: slide.capybaraImage || fallbackImage,
        capybaraImageAlt: slide.capybaraImageAlt || "Capybara",
      };
    }),
  );
};

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
      setLoading(true);
      setError(null);
      try {
        const explanation = await fetchExplanation(bookId, modeId);
        const nextSlides = await enrichSlidesWithMedia(explanation.slides || []);
        setSlides(nextSlides);
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
    [fetchExplanation, t.errors.explanationGeneric],
  );

  const loadTests = useCallback(async (bookId: string | number) => {
    const response = await fetch(`/api/books/tests?book_id=${bookId}`);
    if (!response.ok) {
      throw new Error(t.errors.testsLoad);
    }

    const nextTests = (await response.json()) as BookTest[];
    setTests(nextTests);
    return nextTests;
  }, [t.errors.testsLoad]);

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
      const fallbackModeId = preferredModeId || getMeaningModeId(modes) || modes[0]?.id;

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

      const [nextSlides, nextTests] = await Promise.all([
        enrichSlidesWithMedia(explanation.slides || [], signal),
        fetch(`/api/books/tests?book_id=${book.id}`, { signal }).then((response) => {
          if (!response.ok) {
            return [];
          }
          return response.json();
        }),
      ]);

      if (requestId !== requestRef.current) {
        return null;
      }

      return {
        nextSlides,
        nextTests: (nextTests || []) as BookTest[],
        resolvedModeId,
      };
    },
    [explanationModes, fetchExplanation, loadModes, t.errors.noExplanations, t.errors.noModes],
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
    [currentBook, hydrateBook, selectedModeId, slides, t.errors.bookLoad, tests],
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
