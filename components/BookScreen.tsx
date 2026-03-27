import { useMemo } from "react";
import StoryCarousel from "@/components/StoryCarousel";
import BookQuiz from "@/components/BookQuiz";
import ModeButtons from "@/components/ModeButtons";
import TranslationWarning from "@/components/TranslationWarning";
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
  showRandomBookAction?: boolean;
  onRandomBook: () => void;
  onExplainMeaning: () => void;
  onTakeTest: () => void;
  onCreateVideo: () => void;
  onModeSelect: (modeId: string | number) => void;
  onSlideIndexChange: (slideIndex: number) => void;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onPreloadNextSlide: (slideIndex: number) => void;
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
  showRandomBookAction = true,
  onRandomBook,
  onExplainMeaning,
  onTakeTest,
  onCreateVideo,
  onModeSelect,
  onSlideIndexChange,
  mediaCache,
  onPreloadNextSlide,
  t,
}: BookScreenProps) {
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
        <button type="button" className="feed-action-button" disabled={loading || slides.length === 0} onClick={onCreateVideo}>
          {t.actions.createVideo}
        </button>
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
    </>
  );
}
