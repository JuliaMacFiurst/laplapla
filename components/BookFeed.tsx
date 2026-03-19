import { useCallback, useEffect, useRef, useState } from "react";
import BookCard from "@/components/BookCard";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";
import type { dictionaries } from "@/i18n";

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
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
  t: CapybaraPageDict;
}

export default function BookFeed({
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
  mediaCache,
  onPreloadNextSlide,
  t,
}: BookFeedProps) {
  if (process.env.NODE_ENV === "development") {
    console.log("RENDER:", "BookFeed");
  }

  const feedRef = useRef<HTMLElement | null>(null);
  const lastPanelRef = useRef<HTMLDivElement | null>(null);
  const wheelLocked = useRef(false);
  const mobilePanelCounterRef = useRef(0);
  const mobileLoadQueuedRef = useRef(false);
  const [isMobileFeed, setIsMobileFeed] = useState(false);
  const [mobilePanels, setMobilePanels] = useState<MobileBookPanel[]>([]);

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
          <ErrorMessage message={error} customTitle={errorTitle || t.loadingErrorTitle} dict={t} />
        </div>
      ) : null}

      {book && isMobileFeed ? (
        mobilePanels.map((panel, index) => {
          const isCurrentPanel = index === mobilePanels.length - 1;

          return (
            <div
              key={panel.panelId}
              ref={isCurrentPanel ? lastPanelRef : null}
              className="book-panel"
            >
              <BookCard
                book={panel.book}
                slides={panel.slides}
                tests={panel.tests}
                modes={modes}
                selectedModeId={panel.selectedModeId}
                currentSlideIndex={panel.currentSlideIndex}
                loading={isCurrentPanel ? loading : true}
                showTests={isCurrentPanel ? panel.showTests : false}
                showRandomBookAction={isCurrentPanel ? showRandomBookAction : false}
                onRandomBook={isCurrentPanel ? onNextBook : () => {}}
                onExplainMeaning={isCurrentPanel ? onExplainMeaning : () => {}}
                onTakeTest={isCurrentPanel ? onTakeTest : () => {}}
                onCreateVideo={isCurrentPanel ? onCreateVideo : () => {}}
                onModeSelect={isCurrentPanel ? onModeSelect : () => {}}
                onSlideIndexChange={isCurrentPanel ? onSlideIndexChange : () => {}}
                mediaCache={panel.mediaCache}
                onPreloadNextSlide={isCurrentPanel ? onPreloadNextSlide : () => {}}
                t={t}
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
            aria-label={t.navigation.previousBook}
          >
            <span aria-hidden="true">{t.navigation.previousBook}←</span>
          </button>

          <div className="book-feed-layout">
            <BookCard
              book={book}
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
              mediaCache={mediaCache}
              onPreloadNextSlide={onPreloadNextSlide}
              t={t}
            />
          </div>

          <button
            type="button"
            className="book-feed-nav book-feed-nav-next"
            onClick={maybeLoadNextBook}
            disabled={loading || !hasNextBook}
            aria-label={t.navigation.nextBook}
          >
            <span aria-hidden="true">{t.navigation.nextBook}→</span>
          </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
