import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import BookFeed from "@/components/BookFeed";
import { useBook } from "@/hooks/useBook";
import type { Book } from "@/types/types";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

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
    loading,
    error,
    loadRandomBook,
    loadBook,
    loadPreviousBook,
    loadExplanation,
    hasPreviousBook,
    meaningModeId,
  } = useBook(t, currentLang);
  const [mode, setMode] = useState<"slideshow" | "search">("slideshow");
  const [showTests, setShowTests] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const searchRequestRef = useRef(0);
  const searchControllerRef = useRef<AbortController | null>(null);

  const currentModeId = useMemo(
    () => selectedModeId || meaningModeId || explanationModes[0]?.id || null,
    [explanationModes, meaningModeId, selectedModeId],
  );

  const abortSearchPipeline = useCallback(() => {
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
  }, []);

  const resetSearchState = useCallback(() => {
    searchRequestRef.current += 1;
    abortSearchPipeline();
    setSearchQuery(null);
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
    setShowTests(false);
    setSearchMessage(null);
    setSearchResults(null);
    setSearchQuery(nextQuery);
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

  const handleModeSelect = async (modeId: string | number) => {
    if (!currentBook) {
      return;
    }

    setShowTests(false);
    await loadExplanation(currentBook.id, modeId);
  };

  const handleRandomBook = async () => {
    setShowTests(false);
    await loadRandomBook(currentModeId);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    setShowTests(false);
    setMode("slideshow");
    setSearchResults(null);
    setSearchMessage(null);
    await loadBook(book, currentModeId, { pushHistory: false });
  };

  const handlePreviousBook = () => {
    setShowTests(false);
    loadPreviousBook();
  };

  const handleExplainMeaning = async () => {
    if (!currentBook || !currentModeId) {
      return;
    }

    setShowTests(false);
    await loadExplanation(currentBook.id, meaningModeId || currentModeId);
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

  return (
    <div className="capybara-page-container">
      <header className="capybara-page-header">
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>
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
            showTests={showTests}
            hasPreviousBook={hasPreviousBook}
            hasNextBook
            showRandomBookAction
            onPreviousBook={handlePreviousBook}
            onNextBook={handleRandomBook}
            onExplainMeaning={handleExplainMeaning}
            onTakeTest={() => setShowTests((prev) => !prev)}
            onCreateVideo={handleCreateVideo}
            onModeSelect={handleModeSelect}
            t={t}
          />
        )}
      </main>
    </div>
  );
}
