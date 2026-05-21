import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import BookCard from "@/components/BookCard";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { dictionaries, type Lang } from "@/i18n";
import { buildBookHref, buildBookModeHref } from "@/lib/books/shared";
import type { Book, BookFeedPreview, BookTest, ExplanationMode, Slide } from "@/types/types";
import { useResponsiveViewport } from "@/hooks/useResponsiveViewport";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];
type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

const EMPTY_MEDIA_CACHE = new Map<number, SlideMedia>();

interface MobileBookPanel extends BookFeedPreview {
  panelId: string;
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
  onCreateVideo: (book: Book, slides: Slide[], mediaCache: ReadonlyMap<number, SlideMedia>) => void | Promise<void>;
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
  const router = useRouter();
  const dict = t ?? dictionaries[lang]?.capybaras?.capybaraPage ?? dictionaries.ru.capybaras.capybaraPage;
  const feedRef = useRef<HTMLElement | null>(null);
  const lastPanelRef = useRef<HTMLDivElement | null>(null);
  const wheelLocked = useRef(false);
  const mobilePanelCounterRef = useRef(0);
  const mobilePreviewIdsRef = useRef<string[]>([]);
  const mobilePreviewRequestRef = useRef<Promise<void> | null>(null);
  const [isMobileFeed, setIsMobileFeed] = useState(false);
  const responsiveViewport = useResponsiveViewport();
  const usesTouchBookFeed = responsiveViewport.deviceClass !== "desktop";
  const [mobilePanels, setMobilePanels] = useState<MobileBookPanel[]>([]);
  const [mobilePreviewLoading, setMobilePreviewLoading] = useState(false);
  const [mobilePreviewError, setMobilePreviewError] = useState<string | null>(null);
  const previousBookLabel = dict.navigation?.previousBook || "Previous book";
  const nextBookLabel = dict.navigation?.nextBook || "Next book";

  const openStandaloneBook = useCallback(async (
    targetBook: Book,
    targetMode?: ExplanationMode | string | number | null,
  ) => {
    const resolvedMode =
      targetMode && typeof targetMode === "object"
        ? targetMode
        : modes.find((mode) => String(mode.id) === String(targetMode));
    const href = resolvedMode ? buildBookModeHref(targetBook, resolvedMode) : buildBookHref(targetBook);
    await router.push(href, undefined, { locale: lang });
  }, [lang, modes, router]);

  const loadMobilePreviews = useCallback((count = 4) => {
    if (mobilePreviewRequestRef.current) {
      return mobilePreviewRequestRef.current;
    }

    const request = (async () => {
      setMobilePreviewLoading(true);
      setMobilePreviewError(null);

      try {
        const searchParams = new URLSearchParams({
          count: String(count),
          lang,
        });
        if (mobilePreviewIdsRef.current.length > 0) {
          searchParams.set("exclude_ids", mobilePreviewIdsRef.current.join(","));
        }

        const response = await fetch(`/api/books/feed-previews?${searchParams.toString()}`);
        if (!response.ok) {
          throw new Error(dict.errors.randomBookLoad);
        }

        const previews = (await response.json()) as BookFeedPreview[];
        if (!Array.isArray(previews) || previews.length === 0) {
          throw new Error(dict.errors.randomBookLoad);
        }

        setMobilePanels((previousPanels) => {
          const knownBookIds = new Set(previousPanels.map((panel) => String(panel.book.id)));
          const nextPanels = [...previousPanels];

          previews.forEach((preview) => {
            const bookId = String(preview.book.id);
            if (knownBookIds.has(bookId)) {
              return;
            }

            knownBookIds.add(bookId);
            mobilePanelCounterRef.current += 1;
            nextPanels.push({
              ...preview,
              panelId: `book-panel-${mobilePanelCounterRef.current}`,
            });
          });

          mobilePreviewIdsRef.current = Array.from(knownBookIds).slice(-48);
          return nextPanels;
        });
      } catch (previewError) {
        setMobilePreviewError(previewError instanceof Error ? previewError.message : dict.errors.randomBookLoad);
      } finally {
        setMobilePreviewLoading(false);
      }
    })();

    mobilePreviewRequestRef.current = request;
    void request.finally(() => {
      if (mobilePreviewRequestRef.current === request) {
        mobilePreviewRequestRef.current = null;
      }
    });

    return request;
  }, [dict.errors.randomBookLoad, lang]);

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
    setIsMobileFeed(usesTouchBookFeed);
  }, [usesTouchBookFeed]);

  useEffect(() => {
    if (isMobileFeed) {
      return;
    }

    setMobilePanels([]);
    mobilePreviewIdsRef.current = [];
    mobilePreviewRequestRef.current = null;
  }, [isMobileFeed]);

  useEffect(() => {
    if (!isMobileFeed) {
      return;
    }

    setMobilePanels([]);
    mobilePreviewIdsRef.current = [];
    mobilePreviewRequestRef.current = null;
    void loadMobilePreviews(5);
  }, [isMobileFeed, lang, loadMobilePreviews]);

  useEffect(() => {
    if (!isMobileFeed || !feedRef.current || !lastPanelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        void loadMobilePreviews(4);
      },
      {
        root: feedRef.current,
        rootMargin: "150% 0px",
        threshold: 0.15,
      },
    );

    observer.observe(lastPanelRef.current);
    return () => observer.disconnect();
  }, [isMobileFeed, loadMobilePreviews, mobilePanels]);

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
      {(isMobileFeed ? mobilePreviewLoading && mobilePanels.length === 0 : loading && !book) ? (
        <div className="loading-spinner-container">
          <LoadingSpinner />
        </div>
      ) : null}

      {(isMobileFeed ? mobilePreviewError && mobilePanels.length === 0 : error && !book) ? (
        <div className="error-message-container">
          <ErrorMessage message={(isMobileFeed ? mobilePreviewError : error) || dict.errors.bookLoad} customTitle={errorTitle || dict.loadingErrorTitle} dict={dict} />
        </div>
      ) : null}

      {isMobileFeed ? (
        mobilePanels.map((panel, index) => {
          const isLatestPanel = index === mobilePanels.length - 1;

          return (
            <div
              key={panel.panelId}
              ref={isLatestPanel ? lastPanelRef : null}
              data-panel-id={panel.panelId}
              className="book-panel"
            >
              <BookCard
                book={panel.book}
                lang={lang}
                slides={[panel.firstSlide]}
                tests={[]}
                modes={[]}
                selectedModeId={panel.plotMode?.id ?? null}
                currentSlideIndex={0}
                loading={false}
                showTests={false}
                onStorySwipeStateChange={undefined}
                showRandomBookAction={false}
                onRandomBook={() => {}}
                onExplainMeaning={() => {}}
                onTakeTest={() => {}}
                onCreateVideo={async () => {}}
                onModeSelect={() => {}}
                onSlideIndexChange={() => {}}
                onFindNewImage={async () => {}}
                isFindingNewImage={false}
                mediaCache={EMPTY_MEDIA_CACHE}
                onPreloadNextSlide={() => {}}
                onOpenStandaloneBook={() => void openStandaloneBook(panel.book, panel.plotMode)}
                mobileVariant="feed"
                showEmptyError={false}
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
              onStorySwipeStateChange={undefined}
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
              onOpenStandaloneBook={(modeId) => void openStandaloneBook(book, modeId ?? selectedModeId)}
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
