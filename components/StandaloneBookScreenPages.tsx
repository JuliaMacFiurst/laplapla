import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/router";
import BookScreen from "@/components/BookScreen";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import MultiSelectFilterPanel from "@/components/MultiSelectFilterPanel";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useBook } from "@/hooks/useBook";
import type { AgeCategoryOption, BookGenreOption } from "@/lib/books/filters";
import { buildBookHref, buildBookModeHref, getBookPathSlug, getExplanationModeSegment } from "@/lib/books/shared";
import { buildLocalizedHref, buildLocalizedQuery } from "@/lib/i18n/routing";
import { buildStudioHref } from "@/lib/studioRouting";
import type { dictionaries, Lang } from "@/i18n";
import type { Book } from "@/types/types";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface StandaloneBookScreenPagesProps {
  book: Book;
  lang: Lang;
  t: CapybaraPageDict;
  initialModeId?: string | number | null;
  bottomNavigation?: ReactNode;
}

export default function StandaloneBookScreenPages({
  book,
  lang,
  t,
  initialModeId = null,
  bottomNavigation,
}: StandaloneBookScreenPagesProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [ageCategories, setAgeCategories] = useState<AgeCategoryOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<BookGenreOption[]>([]);
  const [selectedAgeCategories, setSelectedAgeCategories] = useState<string[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpeningStudio, setIsOpeningStudio] = useState(false);
  const searchRequestRef = useRef(0);
  const searchControllerRef = useRef<AbortController | null>(null);
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
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
    preloadNextSlideMedia,
    buildStudioSlides,
    refreshSlideMedia,
    setCurrentBookSlideIndex,
    toggleCurrentBookQuiz,
    closeCurrentBookQuiz,
    mediaCache,
  } = useBook(t, lang, {
    initialBook: book,
    disableInitialRandom: true,
    initialModeId,
  });
  const [refreshingSlideIndex, setRefreshingSlideIndex] = useState<number | null>(null);
  const selectedMode = explanationModes.find((item) => String(item.id) === String(selectedModeId));
  const activeBook = currentBook || book;

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

  useEffect(() => {
    let active = true;

    const loadBookFilters = async () => {
      try {
        const response = await fetch(`/api/books/filters?lang=${encodeURIComponent(lang)}`);
        if (!response.ok) {
          throw new Error("Failed to load book filters");
        }

        const data = await response.json() as {
          ageCategories?: AgeCategoryOption[];
          genres?: BookGenreOption[];
        };

        if (!active) {
          return;
        }

        setAgeCategories(Array.isArray(data.ageCategories) ? data.ageCategories : []);
        setGenreOptions(Array.isArray(data.genres) ? data.genres : []);
      } catch (error) {
        console.error("[BOOK] failed to load standalone search filters:", error);
        if (!active) {
          return;
        }

        setAgeCategories([]);
        setGenreOptions([]);
      }
    };

    void loadBookFilters();

    return () => {
      active = false;
    };
  }, [lang]);

  const buildSearchUrl = useCallback((query: string) => {
    const searchParams = new URLSearchParams();
    if (query) {
      searchParams.set("q", query);
    }
    searchParams.set("lang", lang);
    if (selectedAgeCategories.length > 0) {
      searchParams.set("age_categories", selectedAgeCategories.join(","));
    }
    if (selectedGenreIds.length > 0) {
      searchParams.set("genre_ids", selectedGenreIds.join(","));
    }

    return `/api/books/search?${searchParams.toString()}`;
  }, [lang, selectedAgeCategories, selectedGenreIds]);

  const toggleAgeCategory = useCallback((value: string) => {
    setSelectedAgeCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }, []);

  const toggleGenreId = useCallback((value: string) => {
    setSelectedGenreIds((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }, []);

  const clearSearchFilters = useCallback(() => {
    setSelectedAgeCategories([]);
    setSelectedGenreIds([]);
  }, []);

  const handleSearch = useCallback(async () => {
    const nextQuery = inputValue.trim();

    if (!nextQuery && selectedAgeCategories.length === 0 && selectedGenreIds.length === 0) {
      resetSearchState();
      return;
    }

    setSearchMessage(null);
    setSearchResults(null);
    const requestId = ++searchRequestRef.current;
    abortSearchPipeline();
    const searchController = new AbortController();
    searchControllerRef.current = searchController;
    setSearchLoading(true);

    try {
      const response = await fetch(buildSearchUrl(nextQuery), {
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
  }, [
    abortSearchPipeline,
    buildSearchUrl,
    inputValue,
    resetSearchState,
    selectedAgeCategories.length,
    selectedGenreIds.length,
    t.search.noResults,
    t.search.searchError,
  ]);

  useEffect(() => () => abortSearchPipeline(), [abortSearchPipeline]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (isSearchOpen && target && !searchOverlayRef.current?.contains(target)) {
        setIsSearchOpen(false);
      }

      if (isSettingsOpen && target && !settingsMenuRef.current?.contains(target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobile, isSearchOpen, isSettingsOpen]);

  const handleModeSelect = (modeId: string | number) => {
    closeCurrentBookQuiz();
    const mode = explanationModes.find((item) => String(item.id) === String(modeId));
    const nextHref = mode ? buildBookModeHref(activeBook, mode) : buildBookHref(activeBook);
    window.location.assign(buildLocalizedHref(nextHref, lang));
  };

  const handleExplainMeaning = () => {
    closeCurrentBookQuiz();
    const nextQuery = new URLSearchParams();
    nextQuery.set("lang", lang);
    nextQuery.set("book", getBookPathSlug(activeBook));
    if (selectedMode) {
      nextQuery.set("mode", getExplanationModeSegment(selectedMode));
    }

    window.location.assign(`/caps/stories/create?${nextQuery.toString()}`);
  };

  const handleCreateVideo = async () => {
    setIsOpeningStudio(true);
    try {
      const studioSlides = await buildStudioSlides();
      const studioQuery: Record<string, string> = {
        source: "capybara",
        book: getBookPathSlug(activeBook),
      };

      if (selectedMode) {
        studioQuery.mode = getExplanationModeSegment(selectedMode);
      }

      sessionStorage.setItem("catsSlides", JSON.stringify(studioSlides));
      window.location.assign(buildStudioHref("cats", lang, studioQuery));
    } catch (error) {
      setIsOpeningStudio(false);
      throw error;
    }
  };

  const handleFindNewImage = async (
    slideIndex: number,
    context: { bookTitle: string; modeLabel?: string },
  ) => {
    setRefreshingSlideIndex(slideIndex);
    try {
      await refreshSlideMedia(slideIndex, context);
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSearch();
  };

  const handleClearSearch = () => {
    setInputValue("");
    resetSearchState();
  };

  const renderSearchFilters = () => (
    <MultiSelectFilterPanel
      title={t.search.filtersTitle}
      clearLabel={t.search.clearFilters}
      onClear={clearSearchFilters}
      className="book-search-filter-panel"
      groups={[
        {
          id: "standalone-book-age",
          label: t.search.age,
          options: ageCategories.map((category) => ({
            value: category.value,
            label: category.label,
          })),
          selectedValues: selectedAgeCategories,
          onToggle: toggleAgeCategory,
        },
        {
          id: "standalone-book-genre",
          label: t.search.genre,
          options: genreOptions,
          selectedValues: selectedGenreIds,
          onToggle: toggleGenreId,
        },
      ]}
    />
  );

  const handleOpenSearchBook = (nextBook: Book) => {
    setIsSearchOpen(false);
    setIsSettingsOpen(false);
    resetSearchState();
    setInputValue("");
    void router.push(buildLocalizedHref(buildBookHref(nextBook), lang), undefined, { locale: lang });
  };

  const handleSwitchLanguage = async (nextLang: Lang) => {
    setIsSettingsOpen(false);
    setIsSearchOpen(false);
    await router.push(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          ...buildLocalizedQuery(nextLang),
        },
      },
      undefined,
      { locale: nextLang },
    );
  };

  if (loading && !currentBook) {
    return (
      <div className="loading-spinner-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !currentBook) {
    return (
      <div className="error-message-container">
        <ErrorMessage message={error} customTitle={t.loadingErrorTitle} dict={t} />
      </div>
    );
  }

  if (!currentBook) {
    return null;
  }

  const handleCloseReader = () => {
    const nextQuery = new URLSearchParams();
    nextQuery.set("lang", lang);
    nextQuery.set("book", getBookPathSlug(activeBook));
    if (selectedMode) {
      nextQuery.set("mode", getExplanationModeSegment(selectedMode));
    }

    window.location.assign(`/capybara?${nextQuery.toString()}`);
  };

  const bookContent = (
    <BookScreen
      book={currentBook}
      lang={lang}
      slides={slides}
      tests={tests}
      modes={explanationModes}
      selectedModeId={selectedModeId}
      currentSlideIndex={currentSlideIndex}
      loading={loading}
      showTests={showQuiz}
      showRandomBookAction={false}
      onRandomBook={() => {}}
      onExplainMeaning={handleExplainMeaning}
      onTakeTest={toggleCurrentBookQuiz}
      onCreateVideo={handleCreateVideo}
      onModeSelect={handleModeSelect}
      onSlideIndexChange={setCurrentBookSlideIndex}
      onFindNewImage={handleFindNewImage}
      isFindingNewImage={refreshingSlideIndex === currentSlideIndex}
      mediaCache={mediaCache}
      onPreloadNextSlide={(slideIndex) => {
        void preloadNextSlideMedia(slideIndex);
      }}
      isOpeningStudio={isOpeningStudio}
      bottomNavigation={bottomNavigation}
      t={t}
    />
  );

  return (
    <>
      {isMobile ? (
        <>
          <div className="capybara-mobile-topbar standalone-book-mobile-topbar">
            <button
              type="button"
              className="capybara-mobile-topbar-button capybara-mobile-topbar-close"
              onClick={handleCloseReader}
              aria-label="Close"
            >
              <span aria-hidden="true">×</span>
            </button>
            <button
              type="button"
              className="capybara-mobile-topbar-button capybara-mobile-topbar-search"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t.search.placeholder}
            >
              <span className="search-toggle-button-icon" aria-hidden="true">⌕</span>
            </button>
            <div ref={settingsMenuRef} className="capybara-mobile-settings">
              <button
                type="button"
                className="capybara-mobile-topbar-button capybara-mobile-topbar-settings"
                onClick={() => setIsSettingsOpen((current) => !current)}
                aria-label="Settings"
              >
                <span aria-hidden="true">•••</span>
              </button>
              {isSettingsOpen ? (
                <div className="capybara-mobile-settings-menu">
                  {(["ru", "en", "he"] as Lang[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`capybara-mobile-settings-item ${item === lang ? "capybara-mobile-settings-item-active" : ""}`}
                      onClick={() => void handleSwitchLanguage(item)}
                    >
                      {item.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {isSearchOpen ? (
            <div className="search-overlay standalone-book-search-overlay">
              <div ref={searchOverlayRef} className="search-overlay-panel standalone-book-search-panel">
                <div className="search-overlay-card">
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

                  {renderSearchFilters()}

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
                    <div className="search-results-list standalone-book-search-results">
                      {searchResults.map((resultBook) => (
                        <button
                          key={String(resultBook.id)}
                          type="button"
                          className="search-result-card"
                          onClick={() => handleOpenSearchBook(resultBook)}
                        >
                          <h2 className="book-card-title">{resultBook.title}</h2>
                          {resultBook.author ? <p className="book-card-author">{String(resultBook.author)}</p> : null}
                          {(resultBook.year || resultBook.age_group) ? (
                            <p className="book-card-meta">
                              {[resultBook.year, resultBook.age_group].filter(Boolean).map(String).join(" • ")}
                            </p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      {isMobile ? (
        <>
          <div className="standalone-book-mobile-shell">{bookContent}</div>
          {bottomNavigation ? (
            <div className="mobile-book-bottom-nav">
              <div className="book-reader-bottom-nav">{bottomNavigation}</div>
            </div>
          ) : null}
        </>
      ) : (
        <section className="standalone-book-desktop-shell">
          <form className="search-form standalone-book-desktop-search" onSubmit={handleSearchSubmit}>
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

          {renderSearchFilters()}

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
            <div className="search-results-list standalone-book-search-results standalone-book-search-results-desktop">
              {searchResults.map((resultBook) => (
                <button
                  key={String(resultBook.id)}
                  type="button"
                  className="search-result-card"
                  onClick={() => handleOpenSearchBook(resultBook)}
                >
                  <h2 className="book-card-title">{resultBook.title}</h2>
                  {resultBook.author ? <p className="book-card-author">{String(resultBook.author)}</p> : null}
                  {(resultBook.year || resultBook.age_group) ? (
                    <p className="book-card-meta">
                      {[resultBook.year, resultBook.age_group].filter(Boolean).map(String).join(" • ")}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          <article className="book-card">{bookContent}</article>
        </section>
      )}
    </>
  );
}
