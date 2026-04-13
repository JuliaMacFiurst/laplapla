import { useCallback, useEffect, useRef, useState } from "react";
import BookCard from "@/components/BookCard";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { dictionaries, type Lang } from "@/i18n";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];
type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

interface MobileBookPanel {
  panelId: string;
  book: Book;
  slides: Slide[];
  tests: BookTest[];
  selectedModeId: string | number | null;
  currentSlideIndex: number;
  showTests: boolean;
  mediaCache: ReadonlyMap<number, SlideMedia>;
}

interface BookFeedProps {
  lang: Lang;
  book: Book | null;
  slides: Slide[];
  tests: BookTest[];
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  currentSlideIndex: number;
  loading: boolean;
  error: string | null;
  errorTitle?: string;
  showTests: boolean;
  hasPreviousBook: boolean;
  hasNextBook?: boolean;
  showRandomBookAction?: boolean;
  onPreviousBook: () => void;
  onNextBook: () => void;
  onExplainMeaning: () => void;
  onTakeTest: () => void;
  onCreateVideo: () => void;
  onModeSelect: (modeId: string | number) => void;
  onSlideIndexChange: (slideIndex: number) => void;
  onFindNewImage: (slideIndex: number, context: { bookTitle: string; modeLabel?: string }) => void | Promise<void>;
  isFindingNewImage?: boolean;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
  t?: CapybaraPageDict;
}

export default function BookFeed({
  lang,
  book,
  slides,
  tests,
  modes,
  selectedModeId,
  currentSlideIndex,
  loading,
  error,
  errorTitle,
  showTests,
  hasPreviousBook,
  hasNextBook = true,
  showRandomBookAction = true,
  onPreviousBook,
  onNextBook,
  onExplainMeaning,
  onTakeTest,
  onCreateVideo,
  onModeSelect,
  onSlideIndexChange,
  onFindNewImage,
  isFindingNewImage,
  mediaCache,
  onPreloadNextSlide,
  t,
}: BookFeedProps) {
  const dict = t ?? dictionaries[lang]?.capybaras?.capybaraPage ?? dictionaries.ru.capybaras.capybaraPage;
  const feedRef = useRef<HTMLElement | null>(null);
  const lastPanelRef = useRef<HTMLDivElement | null>(null);
  const wheelLocked = useRef(false);
  const mobilePanelCounterRef = useRef(0);
  const mobileLoadQueuedRef = useRef(false);
  const [isMobileFeed, setIsMobileFeed] = useState(false);
  const [mobilePanels, setMobilePanels] = useState<MobileBookPanel[]>([]);
  const [activeMobilePanelId, setActiveMobilePanelId] = useState<string | null>(null);
  const previousBookLabel = dict.navigation?.previousBook || "Previous book";
  const nextBookLabel = dict.navigation?.nextBook || "Next book";

  const maybeLoadPreviousBook = useCallback(() => {
    if (loading || wheelLocked.current || !hasPreviousBook) {
      return;
    }

    wheelLocked.current = true;
    onPreviousBook();
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 900);
  }, [hasPreviousBook, loading, onPreviousBook]);

  const maybeLoadNextBook = useCallback(() => {
    if (loading || wheelLocked.current || !hasNextBook) {
      return;
    }

    wheelLocked.current = true;
    onNextBook();
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 900);
  }, [hasNextBook, loading, onNextBook]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 899px)");
    const syncMobileFeed = () => {
      setIsMobileFeed(mediaQuery.matches);
    };

    syncMobileFeed();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMobileFeed);
      return () => mediaQuery.removeEventListener("change", syncMobileFeed);
    }

    mediaQuery.addListener(syncMobileFeed);
    return () => mediaQuery.removeListener(syncMobileFeed);
  }, []);

  useEffect(() => {
    if (isMobileFeed) {
      return;
    }

    setMobilePanels([]);
    setActiveMobilePanelId(null);
    mobileLoadQueuedRef.current = false;
  }, [isMobileFeed]);

  useEffect(() => {
    if (!isMobileFeed || !book) {
      return;
    }

    const nextPanelSnapshot: Omit<MobileBookPanel, "panelId"> = {
      book,
      slides,
      tests,
      selectedModeId,
      currentSlideIndex,
      showTests,
      mediaCache: new Map(mediaCache),
    };

    setMobilePanels((prev) => {
      const lastPanel = prev[prev.length - 1];
      if (lastPanel && String(lastPanel.book.id) === String(book.id)) {
        const nextPanels = prev.slice();
        nextPanels[nextPanels.length - 1] = {
          ...lastPanel,
          ...nextPanelSnapshot,
        };
        return nextPanels;
      }

      mobilePanelCounterRef.current += 1;
      const nextPanels = [
        ...prev,
        {
          panelId: `book-panel-${mobilePanelCounterRef.current}`,
          ...nextPanelSnapshot,
        },
      ];

      if (nextPanels.length > 5) {
        return nextPanels.slice(-5);
      }

      return nextPanels;
    });

    if (!loading) {
      mobileLoadQueuedRef.current = false;
    }
  }, [
    book,
    currentSlideIndex,
    isMobileFeed,
    loading,
    mediaCache,
    selectedModeId,
    showTests,
    slides,
    tests,
  ]);

  useEffect(() => {
    if (!isMobileFeed) {
      return;
    }

    setActiveMobilePanelId((current) => current ?? mobilePanels[mobilePanels.length - 1]?.panelId ?? null);
  }, [isMobileFeed, mobilePanels]);

  useEffect(() => {
    if (!isMobileFeed || !feedRef.current || !lastPanelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || loading || mobileLoadQueuedRef.current) {
          return;
        }

        mobileLoadQueuedRef.current = true;
        onNextBook();
      },
      {
        root: feedRef.current,
        threshold: 0.65,
      },
    );

    observer.observe(lastPanelRef.current);
    return () => observer.disconnect();
  }, [isMobileFeed, loading, mobilePanels, onNextBook]);

  useEffect(() => {
    if (!isMobileFeed || !feedRef.current) {
      return;
    }

    const panels = Array.from(feedRef.current.querySelectorAll<HTMLDivElement>(".book-panel[data-panel-id]"));
    if (!panels.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visiblePanel = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const panelId = visiblePanel?.target.getAttribute("data-panel-id");
        if (panelId) {
          setActiveMobilePanelId(panelId);
        }
      },
      {
        root: feedRef.current,
        threshold: [0.45, 0.65, 0.85],
      },
    );

    panels.forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, [isMobileFeed, mobilePanels]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMobileFeed) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        maybeLoadPreviousBook();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        maybeLoadNextBook();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileFeed, maybeLoadNextBook, maybeLoadPreviousBook]);

  return (
    <section
      ref={feedRef}
      className={`book-feed ${isMobileFeed ? "book-feed-mobile" : ""}`}
      onWheel={(event) => {
        if (isMobileFeed) {
          return;
        }

        if (event.deltaY > 70) {
          maybeLoadNextBook();
        }
      }}
    >
      {loading && !book ? (
        <div className="loading-spinner-container">
          <LoadingSpinner />
        </div>
      ) : null}

      {error && !book ? (
        <div className="error-message-container">
          <ErrorMessage message={error} customTitle={errorTitle || dict.loadingErrorTitle} dict={dict} />
        </div>
      ) : null}

      {book && isMobileFeed ? (
        mobilePanels.map((panel, index) => {
          const isLatestPanel = index === mobilePanels.length - 1;
          const isInteractivePanel = activeMobilePanelId
            ? activeMobilePanelId === panel.panelId
            : isLatestPanel;

          return (
            <div
              key={panel.panelId}
              ref={isLatestPanel ? lastPanelRef : null}
              data-panel-id={panel.panelId}
              className={`book-panel ${activeMobilePanelId === panel.panelId ? "book-panel-active" : "book-panel-inactive"}`}
            >
              <BookCard
                book={panel.book}
                lang={lang}
                slides={panel.slides}
                tests={panel.tests}
                modes={modes}
                selectedModeId={panel.selectedModeId}
                currentSlideIndex={panel.currentSlideIndex}
                loading={isInteractivePanel ? loading : true}
                showTests={isInteractivePanel ? showTests : panel.showTests}
                showRandomBookAction={isInteractivePanel ? showRandomBookAction : false}
                onRandomBook={isInteractivePanel ? onNextBook : () => {}}
                onExplainMeaning={isInteractivePanel ? onExplainMeaning : () => {}}
                onTakeTest={isInteractivePanel ? onTakeTest : () => {}}
                onCreateVideo={isInteractivePanel ? onCreateVideo : () => {}}
                onModeSelect={isInteractivePanel ? onModeSelect : () => {}}
                onSlideIndexChange={isInteractivePanel ? onSlideIndexChange : () => {}}
                onFindNewImage={isInteractivePanel ? onFindNewImage : async () => {}}
                isFindingNewImage={isInteractivePanel ? isFindingNewImage : false}
                mediaCache={panel.mediaCache}
                onPreloadNextSlide={isInteractivePanel ? onPreloadNextSlide : () => {}}
                showEmptyError={isInteractivePanel ? Boolean(error && !loading && slides.length === 0) : false}
                t={dict}
              />
            </div>
          );
        })
      ) : null}

      {book && !isMobileFeed ? (
        <>
        <div className="book-feed-content">
          <button
            type="button"
            className="book-feed-nav book-feed-nav-prev"
            onClick={maybeLoadPreviousBook}
            disabled={loading || !hasPreviousBook}
            aria-label={previousBookLabel}
          >
            <span className="book-feed-nav-content" aria-hidden="true">
              <span className="book-feed-nav-label" dir="auto">{previousBookLabel}</span>
            </span>
          </button>

          <div className="book-feed-layout">
            <BookCard
              book={book}
              lang={lang}
              slides={slides}
              tests={tests}
              modes={modes}
              selectedModeId={selectedModeId}
              currentSlideIndex={currentSlideIndex}
              loading={loading}
              showTests={showTests}
              showRandomBookAction={showRandomBookAction}
              onRandomBook={onNextBook}
              onExplainMeaning={onExplainMeaning}
              onTakeTest={onTakeTest}
              onCreateVideo={onCreateVideo}
              onModeSelect={onModeSelect}
              onSlideIndexChange={onSlideIndexChange}
              onFindNewImage={onFindNewImage}
              isFindingNewImage={isFindingNewImage}
              mediaCache={mediaCache}
              onPreloadNextSlide={onPreloadNextSlide}
              showEmptyError={Boolean(error && !loading && slides.length === 0)}
              t={dict}
            />
          </div>

          <button
            type="button"
            className="book-feed-nav book-feed-nav-next"
            onClick={maybeLoadNextBook}
            disabled={loading || !hasNextBook}
            aria-label={nextBookLabel}
          >
            <span className="book-feed-nav-content" aria-hidden="true">
              <span className="book-feed-nav-label" dir="auto">{nextBookLabel}</span>
            </span>
          </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
