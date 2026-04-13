import { useMemo } from "react";
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
  onTakeTest: () => void;
  onCreateStory: () => void;
  onOpenStudio: () => void;
  onModeSelect: (modeId: string | number) => void;
  onSlideIndexChange: (slideIndex: number) => void;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
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
  onTakeTest,
  onCreateStory,
  onOpenStudio,
  onModeSelect,
  onSlideIndexChange,
  mediaCache,
  onPreloadNextSlide,
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
  const studioLabel = lang === "ru"
    ? "Открыть в Студии котиков"
    : lang === "he"
      ? "לפתוח בסטודיו החתולים"
      : "Open in Cat Studio";
  const testCaption = lang === "ru"
    ? "Тест по книге"
    : lang === "he"
      ? "חידון על הספר"
      : "Book quiz";
  const closeTestLabel = lang === "ru"
    ? "Закрыть тест"
    : lang === "he"
      ? "לסגור את החידון"
      : "Close quiz";
  return (
    <div className="mobile-book-screen">
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
          onSelect={onModeSelect}
        />
      </div>

      <div className="mobile-book-stage">
        <MobileStoryCarousel
          story={story}
          lang={lang}
          t={t}
          currentSlideIndex={currentSlideIndex}
          onSlideIndexChange={onSlideIndexChange}
          emptyMessage={t.storyError}
          mediaCache={mediaCache}
          onPreloadNextSlide={onPreloadNextSlide}
          showEmptyError={showEmptyError}
        />
      </div>

      <div className="mobile-book-actions">
        <button type="button" className="mobile-action-pill mobile-action-pill-primary" onClick={onCreateStory}>
          {t.actions.createStory}
        </button>
        <button
          type="button"
          className="mobile-action-pill mobile-action-pill-secondary"
          disabled={!activeTest}
          onClick={onTakeTest}
        >
          {t.actions.takeTest}
        </button>
        <button
          type="button"
          className="mobile-action-pill mobile-action-pill-accent"
          disabled={slides.length === 0}
          onClick={onOpenStudio}
        >
          {studioLabel}
        </button>
      </div>

      {showTests ? (
        <div className="mobile-quiz-sheet" role="dialog" aria-modal="true">
          <div className="mobile-quiz-sheet-header">
            <div>
              <p className="mobile-quiz-sheet-caption">{testCaption}</p>
              <h3 className="mobile-quiz-sheet-title">{activeTest?.title || t.testTitle}</h3>
            </div>
            <button type="button" className="mobile-quiz-sheet-close" onClick={onTakeTest} aria-label={closeTestLabel}>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {activeTest ? (
            <BookQuiz bookId={book.id} test={activeTest} t={t} variant="mobile-fullscreen" />
          ) : (
            <p className="book-tests-empty">Тест пока недоступен</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
