import { useMemo, type ReactNode } from "react";
import StoryCarousel from "@/components/StoryCarousel";
import BookQuiz from "@/components/BookQuiz";
import ModeButtons from "@/components/ModeButtons";
import TranslationWarning from "@/components/TranslationWarning";
import MobileBookScreen from "@/components/capybara/mobile/MobileBookScreen";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";
import type { dictionaries, Lang } from "@/i18n";
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

interface BookScreenProps {
  book: Book;
  lang: Lang;
  slides: Slide[];
  tests: BookTest[];
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  currentSlideIndex: number;
  loading?: boolean;
  showTests?: boolean;
  onStorySwipeStateChange?: (isSwiping: boolean) => void;
  showRandomBookAction?: boolean;
  onRandomBook: () => void;
  onExplainMeaning: () => void;
  onTakeTest: () => void;
  onCreateVideo: (book: Book, slides: Slide[], mediaCache: ReadonlyMap<number, SlideMedia>) => void | Promise<void>;
  onModeSelect: (modeId: string | number) => void;
  onSlideIndexChange: (slideIndex: number) => void;
  onFindNewImage: (slideIndex: number, context: { bookTitle: string; modeLabel?: string }) => void | Promise<void>;
  isFindingNewImage?: boolean;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
  onOpenStandaloneBook?: (modeId?: string | number | null) => void;
  mobileVariant?: "feed" | "reader";
  isOpeningStudio?: boolean;
  showEmptyError?: boolean;
  bottomNavigation?: ReactNode;
  t: CapybaraPageDict;
}

export default function BookScreen({
  book,
  lang,
  slides,
  tests,
  modes,
  selectedModeId,
  currentSlideIndex,
  loading,
  showTests,
  onStorySwipeStateChange,
  showRandomBookAction = true,
  onRandomBook,
  onExplainMeaning,
  onTakeTest,
  onCreateVideo,
  onModeSelect,
  onSlideIndexChange,
  onFindNewImage,
  isFindingNewImage,
  mediaCache,
  onPreloadNextSlide,
  onOpenStandaloneBook,
  mobileVariant = "reader",
  isOpeningStudio = false,
  showEmptyError,
  bottomNavigation,
  t,
}: BookScreenProps) {
  const responsiveViewport = useResponsiveViewport();
  const usesTouchBookLayout = responsiveViewport.deviceClass !== "desktop";
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

  const getValidQuestions = (quiz: BookTest | null) => {
    const validQuestions = (quiz?.questions || []).filter((q) =>
      q &&
      typeof q.question === "string" &&
      q.question.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length > 0,
    );

    return validQuestions;
  };

  const year = typeof book.year === "string" || typeof book.year === "number"
    ? String(book.year).trim()
    : "";
  const ageGroup = typeof book.age_group === "string" || typeof book.age_group === "number"
    ? String(book.age_group).trim()
    : "";
  const hasSecondaryMeta = Boolean(year || ageGroup);
  const activeTest = useMemo(
    () => {
      const matchingTest = tests.find((test) => {
        const normalizedTest = normalizeQuizTest(test);
        return getValidQuestions(normalizedTest).length > 0;
      });

      if (!matchingTest) {
        return null;
      }

      const normalizedTest = normalizeQuizTest(matchingTest);
      const validQuestions = getValidQuestions(normalizedTest);

      if (validQuestions.length === 0) {
        return null;
      }

      return {
        ...normalizedTest,
        questions: validQuestions,
      };
    },
    [tests],
  );
  const story = useMemo(
    () => ({
      id: `${String(book.id)}-${String(selectedModeId ?? "default")}`,
      title: book.title,
      slides,
    }),
    [book.id, book.title, selectedModeId, slides],
  );
  const selectedModeLabel = useMemo(
    () =>
      modes.find((mode) => String(mode.id) === String(selectedModeId))?.title ||
      modes.find((mode) => String(mode.id) === String(selectedModeId))?.name ||
      undefined,
    [modes, selectedModeId],
  );

  if (usesTouchBookLayout) {
    return (
      <MobileBookScreen
        book={book}
        lang={lang}
        slides={slides}
        tests={tests}
        modes={modes}
        selectedModeId={selectedModeId}
        currentSlideIndex={currentSlideIndex}
        loading={loading}
        showTests={showTests}
        onSwipeStateChange={onStorySwipeStateChange}
        onTakeTest={onTakeTest}
        onCreateStory={onExplainMeaning}
        onOpenStudio={() => void onCreateVideo(book, slides, mediaCache)}
        onModeSelect={onModeSelect}
        onSlideIndexChange={onSlideIndexChange}
        mediaCache={mediaCache}
        onPreloadNextSlide={onPreloadNextSlide}
        onOpenStandaloneBook={onOpenStandaloneBook}
        variant={mobileVariant}
        isOpeningStudio={isOpeningStudio}
        showEmptyError={showEmptyError}
        t={t}
      />
    );
  }

  return (
    <>
      <div className="book-card-head">
        <div className="book-card-heading">
          {lang !== "ru" && book.translated === false ? <TranslationWarning lang={lang} subject="book" /> : null}
          <h2 className="book-card-title">{book.title}</h2>
          {book.author ? <p className="book-card-author">{String(book.author)}</p> : null}
          {hasSecondaryMeta ? (
            <p className="book-card-meta">
              {[year, ageGroup].filter(Boolean).join(" • ")}
            </p>
          ) : null}
        </div>

        <ModeButtons
          lang={lang}
          modes={modes}
          selectedModeId={selectedModeId}
          disabled={loading}
          onSelect={onModeSelect}
        />
      </div>

      <div className="book-card-body">
        <StoryCarousel
          story={story}
          lang={lang}
          t={t}
          currentSlideIndex={currentSlideIndex}
          onSlideIndexChange={onSlideIndexChange}
          onFindNewImage={(slideIndex) => onFindNewImage(slideIndex, { bookTitle: book.title, modeLabel: selectedModeLabel })}
          isFindingNewImage={isFindingNewImage}
          textClassName="story-carousel-text"
          emptyMessage={t.storyError}
          mediaCache={mediaCache}
          onPreloadNextSlide={onPreloadNextSlide}
        />
      </div>

      <div className="book-card-actions">
        {showRandomBookAction ? (
          <button type="button" className="feed-action-button" disabled={loading} onClick={onRandomBook}>
            {t.actions.randomBook}
          </button>
        ) : null}
        <button type="button" className="feed-action-button" disabled={loading} onClick={onExplainMeaning}>
          {t.actions.createStory}
        </button>
        <button
          type="button"
          className="feed-action-button"
          disabled={loading || !activeTest}
          onClick={onTakeTest}
        >
          {t.actions.takeTest}
        </button>
        {!usesTouchBookLayout ? (
          <button
            type="button"
            className="feed-action-button"
            disabled={loading || slides.length === 0}
            onClick={() => void onCreateVideo(book, slides, mediaCache)}
          >
            {t.actions.createVideo}
          </button>
        ) : null}
      </div>

      {showTests ? (
        <div className="book-tests-panel">
          <h3 className="book-tests-title">{activeTest?.title || t.testTitle}</h3>
          {activeTest ? (
            <BookQuiz bookId={book.id} test={activeTest} t={t} />
          ) : (
            <p className="book-tests-empty">Тест пока недоступен</p>
          )}
        </div>
      ) : null}

      {bottomNavigation ? <div className="book-reader-bottom-nav">{bottomNavigation}</div> : null}
    </>
  );
}
