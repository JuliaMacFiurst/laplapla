import { useMemo } from "react";
import StoryCarousel from "@/components/StoryCarousel";
import BookQuiz from "@/components/BookQuiz";
import ModeButtons from "@/components/ModeButtons";
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

interface BookScreenProps {
  book: Book;
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
  const year = typeof book.year === "string" || typeof book.year === "number"
    ? String(book.year).trim()
    : "";
  const ageGroup = typeof book.age_group === "string" || typeof book.age_group === "number"
    ? String(book.age_group).trim()
    : "";
  const hasSecondaryMeta = Boolean(year || ageGroup);
  const activeTest = useMemo(
    () => tests.find((test) => Array.isArray(test.questions) && test.questions.length > 0) || null,
    [tests],
  );

  return (
    <>
      <div className="book-card-head">
        <div className="book-card-heading">
          <h2 className="book-card-title">{book.title}</h2>
          {book.author ? <p className="book-card-author">{String(book.author)}</p> : null}
          {hasSecondaryMeta ? (
            <p className="book-card-meta">
              {[year, ageGroup].filter(Boolean).join(" • ")}
            </p>
          ) : null}
        </div>

        <ModeButtons
          modes={modes}
          selectedModeId={selectedModeId}
          disabled={loading}
          onSelect={onModeSelect}
        />
      </div>

      <div className="book-card-body">
        <StoryCarousel
          story={{
            id: `${String(book.id)}-${String(selectedModeId ?? "default")}`,
            title: book.title,
            slides,
          }}
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
          {t.actions.explainMeaning}
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
          <BookQuiz bookId={book.id} test={activeTest} t={t} />
        </div>
      ) : null}
    </>
  );
}
