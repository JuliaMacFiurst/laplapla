import { useMemo } from "react";
import { fallbackImages } from "@/constants";
import BookQuiz from "@/components/BookQuiz";
import MobileModeTabs from "@/components/capybara/mobile/MobileModeTabs";
import MobileStoryCarousel from "@/components/capybara/mobile/MobileStoryCarousel";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";
import type { dictionaries, Lang } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

interface MobileBookScreenProps {
  book: Book;
  lang: Lang;
  slides: Slide[];
  tests: BookTest[];
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  currentSlideIndex: number;
  loading?: boolean;
  showTests?: boolean;
  onSwipeStateChange?: (isSwiping: boolean) => void;
  onTakeTest: () => void;
  onCreateStory: () => void;
  onOpenStudio: () => void;
  onModeSelect: (modeId: string | number) => void;
  onSlideIndexChange: (slideIndex: number) => void;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
  onOpenStandaloneBook?: (modeId?: string | number | null) => void;
  variant?: "feed" | "reader";
  isOpeningStudio?: boolean;
  showEmptyError?: boolean;
  t: CapybaraPageDict;
}

export default function MobileBookScreen({
  book,
  lang,
  slides,
  tests,
  modes,
  selectedModeId,
  currentSlideIndex,
  loading,
  showTests,
  onSwipeStateChange,
  onTakeTest,
  onCreateStory,
  onOpenStudio,
  onModeSelect,
  onSlideIndexChange,
  mediaCache,
  onPreloadNextSlide,
  onOpenStandaloneBook,
  variant = "reader",
  isOpeningStudio = false,
  showEmptyError,
  t,
}: MobileBookScreenProps) {
  const normalizeQuizTest = (test: BookTest) => {
    if (Array.isArray(test.questions)) {
      return test;
    }

    const nestedQuiz = test.quiz;
    if (
      nestedQuiz &&
      typeof nestedQuiz === "object" &&
      !Array.isArray(nestedQuiz) &&
      Array.isArray((nestedQuiz as { questions?: unknown[] }).questions)
    ) {
      return {
        ...test,
        questions: (nestedQuiz as { questions: BookTest["questions"] }).questions,
      };
    }

    return test;
  };

  const getValidQuestions = (quiz: BookTest | null) =>
    (quiz?.questions || []).filter((q) =>
      q &&
      typeof q.question === "string" &&
      q.question.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length > 0,
    );

  const activeTest = useMemo(() => {
    const matchingTest = tests.find((test) => getValidQuestions(normalizeQuizTest(test)).length > 0);
    if (!matchingTest) {
      return null;
    }

    const normalizedTest = normalizeQuizTest(matchingTest);
    const questions = getValidQuestions(normalizedTest);

    if (questions.length === 0) {
      return null;
    }

    return {
      ...normalizedTest,
      questions,
    };
  }, [tests]);

  const story = useMemo(
    () => ({
      id: `${String(book.id)}-${String(selectedModeId ?? "default")}`,
      title: book.title,
      slides,
    }),
    [book.id, book.title, selectedModeId, slides],
  );

  const year = typeof book.year === "string" || typeof book.year === "number"
    ? String(book.year).trim()
    : "";
  const ageGroup = typeof book.age_group === "string" || typeof book.age_group === "number"
    ? String(book.age_group).trim()
    : "";
  const isReader = variant === "reader";
  const feedModeSelect = (modeId: string | number) => {
    if (onOpenStandaloneBook) {
      onOpenStandaloneBook(modeId);
      return;
    }

    onModeSelect(modeId);
  };
  const firstSlide = slides[0] || null;
  const firstSlideMedia = mediaCache.get(0) || null;
  const previewSeed = `${String(book.id)}-${String(selectedModeId ?? "default")}`;
  const fallbackIndex = Math.abs(
    Array.from(previewSeed).reduce((acc, char) => acc + char.charCodeAt(0), 0),
  ) % fallbackImages.length;
  const previewMediaUrl = firstSlideMedia?.capybaraImage ||
    firstSlideMedia?.gifUrl ||
    firstSlideMedia?.imageUrl ||
    `/images/capybaras/${fallbackImages[fallbackIndex]}`;

  return (
    <div className={`mobile-book-screen ${isReader ? "mobile-book-screen-reader" : "mobile-book-screen-feed"}`}>
      <div className="mobile-book-header">
        <div className="mobile-book-header-copy">
          <h2 className="mobile-book-title">{book.title}</h2>
          <div className="mobile-book-subline">
            {book.author ? <span className="mobile-book-author">{String(book.author)}</span> : null}
            {year ? <span className="mobile-book-chip">{year}</span> : null}
            {ageGroup ? <span className="mobile-book-chip">{ageGroup}</span> : null}
          </div>
        </div>

        <MobileModeTabs
          lang={lang}
          modes={modes}
          selectedModeId={selectedModeId}
          disabled={loading}
          onSelect={isReader ? onModeSelect : feedModeSelect}
        />
      </div>

      <div className="mobile-book-stage">
        {isReader ? (
          <MobileStoryCarousel
            story={story}
            lang={lang}
            t={t}
            initialSlideIndex={currentSlideIndex}
            onSlideIndexChange={onSlideIndexChange}
            onSwipeStateChange={onSwipeStateChange}
            emptyMessage={t.storyError}
            mediaCache={mediaCache}
            onPreloadNextSlide={onPreloadNextSlide}
            showEmptyError={showEmptyError}
          />
        ) : (
          <button
            type="button"
            className="mobile-book-preview-button"
            onClick={() => onOpenStandaloneBook?.(selectedModeId)}
          >
            <div className="mobile-story-media">
              {firstSlideMedia?.type === "video" && firstSlideMedia.videoUrl ? (
                <video
                  src={firstSlideMedia.videoUrl}
                  className="mobile-story-media-asset"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={previewMediaUrl}
                  alt={firstSlideMedia?.capybaraImageAlt || firstSlide?.text?.trim() || book.title || "illustration"}
                  className="mobile-story-media-asset"
                  draggable={false}
                />
              )}
              <div className="mobile-story-text">
                <p className="mobile-story-text-copy">{firstSlide?.text || t.storyError}</p>
                <span className="mobile-book-preview-hint">Открыть слайды</span>
              </div>
            </div>
          </button>
        )}
      </div>

      {isReader ? (
        <div className="mobile-book-actions">
          <button type="button" className="mobile-action-pill mobile-action-pill-primary" onClick={onCreateStory}>
            <span className="mobile-action-pill-label">{t.actions.createStory}</span>
          </button>
          <button
            type="button"
            className="mobile-action-pill mobile-action-pill-secondary"
            disabled={!activeTest}
            onClick={onTakeTest}
          >
            <span className="mobile-action-pill-label">{t.actions.takeTest}</span>
          </button>
          <button
            type="button"
            className={`mobile-action-pill mobile-action-pill-accent ${isOpeningStudio ? "mobile-action-pill-loading" : ""}`}
            disabled={slides.length === 0 || isOpeningStudio}
            onClick={onOpenStudio}
            aria-busy={isOpeningStudio}
          >
            <span className="mobile-action-pill-label">{t.actions.openCatsStudio}</span>
          </button>
        </div>
      ) : null}

      {showTests ? (
        <div className="mobile-quiz-sheet" role="dialog" aria-modal="true">
          <div className="mobile-quiz-sheet-header">
            <div>
              <p className="mobile-quiz-sheet-caption">{t.testTitle}</p>
              <h3 className="mobile-quiz-sheet-title">{activeTest?.title || t.testTitle}</h3>
            </div>
            <button type="button" className="mobile-quiz-sheet-close" onClick={onTakeTest} aria-label={t.quiz.close}>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {activeTest ? (
            <BookQuiz bookId={book.id} test={activeTest} t={t} variant="mobile-fullscreen" />
          ) : (
            <p className="book-tests-empty">{t.noTests}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
