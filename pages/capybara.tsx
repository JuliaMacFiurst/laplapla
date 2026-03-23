import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import BookFeed from "@/components/BookFeed";
import { useBook } from "@/hooks/useBook";
import { buildBookHref, buildBookModeHref } from "@/lib/books";
import type { Book } from "@/types/types";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedHref, buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

export default function CapybaraPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const currentLang = getCurrentLang(router) || lang;
  const dict = dictionaries[currentLang] || dictionaries.ru;
  const t = dict.capybaras.capybaraPage;
  const {
    currentBook,
    slides,
    tests,
    explanationModes,
    selectedModeId,
    currentSlideIndex,
    showQuiz,
    loading,
    error,
    loadRandomBook,
    loadBook,
    loadPreviousBook,
    loadExplanation,
    hasPreviousBook,
    preloadNextSlideMedia,
    setCurrentBookSlideIndex,
    toggleCurrentBookQuiz,
    closeCurrentBookQuiz,
    mediaCache,
  } = useBook(t, currentLang);
  const [mode, setMode] = useState<"slideshow" | "search">("slideshow");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const searchRequestRef = useRef(0);
  const searchControllerRef = useRef<AbortController | null>(null);
  const lastSyncedPathRef = useRef<string | null>(null);
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);

  const abortSearchPipeline = useCallback(() => {
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
  }, []);

  const resetSearchState = useCallback(() => {
    searchRequestRef.current += 1;
    abortSearchPipeline();
    setSearchResults(null);
    setSearchLoading(false);
    setSearchMessage(null);
  }, [abortSearchPipeline]);

  const handleSearch = useCallback(async () => {
    const nextQuery = inputValue.trim();

    if (!nextQuery) {
      resetSearchState();
      return;
    }

    setMode("search");
    closeCurrentBookQuiz();
    setSearchMessage(null);
    setSearchResults(null);
    const requestId = ++searchRequestRef.current;
    abortSearchPipeline();
    const searchController = new AbortController();
    searchControllerRef.current = searchController;
    setSearchLoading(true);

    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(nextQuery)}`, {
        signal: searchController.signal,
      });
      if (!response.ok) {
        throw new Error(t.search.searchError);
      }

      const results = (await response.json()) as Book[];
      if (requestId !== searchRequestRef.current) {
        return;
      }

      setSearchResults(results);
      setSearchMessage(results.length === 0 ? t.search.noResults : null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      if (requestId !== searchRequestRef.current) {
        return;
      }

      setSearchResults([]);
      setSearchMessage(t.search.searchError);
    } finally {
      if (searchControllerRef.current === searchController) {
        searchControllerRef.current = null;
      }

      if (requestId === searchRequestRef.current) {
        setSearchLoading(false);
      }
    }
  }, [abortSearchPipeline, inputValue, resetSearchState, t.search.noResults, t.search.searchError]);

  useEffect(() => () => abortSearchPipeline(), [abortSearchPipeline]);

  const syncBookRoute = useCallback((book: Book | null, modeId: string | number | null) => {
    if (!book) {
      return;
    }

    const bookPath = buildBookHref(book);
    if (!bookPath) {
      return;
    }

    const nextMode = explanationModes.find((candidate) => String(candidate.id) === String(modeId));
    const nextMaskedPath = nextMode ? buildBookModeHref(book, nextMode) : bookPath;
    const localizedMaskedPath = buildLocalizedHref(nextMaskedPath, currentLang);

    if (
      typeof window !== "undefined" &&
      (window.location.pathname + window.location.search === localizedMaskedPath ||
        lastSyncedPathRef.current === localizedMaskedPath)
    ) {
      return;
    }

    lastSyncedPathRef.current = localizedMaskedPath;
    void router.push(
      {
        pathname: router.pathname,
        query: buildLocalizedQuery(currentLang),
      },
      localizedMaskedPath,
      {
        shallow: true,
        scroll: false,
        locale: currentLang,
      },
    );
  }, [currentLang, explanationModes, router]);

  useEffect(() => {
    if (mode === "search") {
      return;
    }

    syncBookRoute(currentBook, selectedModeId);
  }, [currentBook, mode, selectedModeId, syncBookRoute]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!searchOverlayRef.current?.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSearchOpen]);

  const handleModeSelect = async (modeId: string | number) => {
    if (!currentBook) {
      return;
    }

    closeCurrentBookQuiz();
    await loadExplanation(currentBook.id, modeId);
  };

  const handleRandomBook = async () => {
    closeCurrentBookQuiz();
    await loadRandomBook();
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSearchOpen(false);
    void handleSearch();
  };

  const handleClearSearch = () => {
    setInputValue("");
    setMode("slideshow");
    resetSearchState();
  };

  const handleExitSearch = () => {
    setMode("slideshow");
    resetSearchState();
  };

  const handleOpenSearchBook = async (book: Book) => {
    closeCurrentBookQuiz();
    setMode("slideshow");
    setSearchResults(null);
    setSearchMessage(null);
    await loadBook(book, undefined, { pushHistory: false });
  };

  const handlePreviousBook = () => {
    closeCurrentBookQuiz();
    loadPreviousBook();
  };

  const handleExplainMeaning = async () => {
    closeCurrentBookQuiz();
    await router.push(
      { pathname: "/caps/stories/create", query: buildLocalizedQuery(currentLang) },
      undefined,
      { locale: currentLang },
    );
  };

  const handleCreateVideo = () => {
    const studioSlides = slides.map((slide) => ({
      text: slide.text,
      image: slide.capybaraImage || slide.imageUrl || slide.gifUrl || slide.videoUrl,
    }));

    sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
    router.push(
      { pathname: "/cats/studio", query: buildLocalizedQuery(currentLang) },
      undefined,
      { locale: currentLang },
    );
  };

  const handlePreloadNextSlide = useCallback((slideIndex: number) => {
    void preloadNextSlideMedia(slideIndex);
  }, [preloadNextSlideMedia]);

  return (
    <div className="capybara-page-container">
      <header className="capybara-page-header">
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>
        <button
          type="button"
          className="search-toggle-button"
          onClick={() => setIsSearchOpen(true)}
          aria-label={t.search.placeholder}
        >
          <span aria-hidden="true">🔍</span>
        </button>
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={t.search.placeholder}
              aria-label={t.search.placeholder}
            />
            {inputValue ? (
              <button
                type="button"
                className="search-clear-button"
                onClick={handleClearSearch}
                aria-label={t.search.clear}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
            <button type="submit" className="search-button" disabled={searchLoading}>
              {t.search.button}
            </button>
          </div>
        </form>
      </header>

      {isSearchOpen ? (
        <div className="search-overlay">
          <div ref={searchOverlayRef} className="search-overlay-panel">
            <form className="search-form-expanded" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="search-input search-input-expanded"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={t.search.placeholder}
                aria-label={t.search.placeholder}
                autoFocus
              />
              {inputValue ? (
                <button
                  type="button"
                  className="search-clear-button"
                  onClick={handleClearSearch}
                  aria-label={t.search.clear}
                >
                  <span aria-hidden="true">×</span>
                </button>
              ) : null}
              <button type="submit" className="search-button" disabled={searchLoading}>
                {t.search.button}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <main className="capybara-page-main capybara-feed-main">
        {mode === "search" ? (
          <section className="search-results-panel">
            <button type="button" className="search-exit-button" onClick={handleExitSearch}>
              {t.search.backToFeed}
            </button>

            {searchLoading ? (
              <div className="loading-spinner-container">
                <div className="search-results-status">{t.search.title}</div>
              </div>
            ) : null}

            {!searchLoading && searchMessage ? (
              <div className="error-message-container">
                <p className="search-results-status">{searchMessage}</p>
              </div>
            ) : null}

            {!searchLoading && !searchMessage && searchResults?.length ? (
              <div className="search-results-list">
                {searchResults.map((book) => (
                  <button
                    key={String(book.id)}
                    type="button"
                    className="search-result-card"
                    onClick={() => void handleOpenSearchBook(book)}
                  >
                    <h2 className="book-card-title">{book.title}</h2>
                    {book.author ? <p className="book-card-author">{String(book.author)}</p> : null}
                    {(book.year || book.age_group) ? (
                      <p className="book-card-meta">
                        {[book.year, book.age_group].filter(Boolean).map(String).join(" • ")}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <BookFeed
            book={currentBook}
            slides={slides}
            tests={tests}
            modes={explanationModes}
            selectedModeId={selectedModeId}
            loading={loading}
            error={error}
            errorTitle={t.loadingErrorTitle}
            currentSlideIndex={currentSlideIndex}
            showTests={showQuiz}
            hasPreviousBook={hasPreviousBook}
            hasNextBook
            showRandomBookAction
            onPreviousBook={handlePreviousBook}
            onNextBook={handleRandomBook}
            onExplainMeaning={handleExplainMeaning}
            onTakeTest={toggleCurrentBookQuiz}
            onCreateVideo={handleCreateVideo}
            onModeSelect={handleModeSelect}
            onSlideIndexChange={setCurrentBookSlideIndex}
            mediaCache={mediaCache}
            onPreloadNextSlide={handlePreloadNextSlide}
            t={t}
          />
        )}
      </main>
    </div>
  );
}
