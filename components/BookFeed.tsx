import { useRef } from "react";
import BookCard from "@/components/BookCard";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";
import type { dictionaries } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface BookFeedProps {
  book: Book | null;
  slides: Slide[];
  tests: BookTest[];
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  loading: boolean;
  error: string | null;
  showTests: boolean;
  onNextBook: () => void;
  onExplainMeaning: () => void;
  onTakeTest: () => void;
  onCreateVideo: () => void;
  onModeSelect: (modeId: string | number) => void;
  t: CapybaraPageDict;
}

export default function BookFeed({
  book,
  slides,
  tests,
  modes,
  selectedModeId,
  loading,
  error,
  showTests,
  onNextBook,
  onExplainMeaning,
  onTakeTest,
  onCreateVideo,
  onModeSelect,
  t,
}: BookFeedProps) {
  const touchStartY = useRef<number | null>(null);
  const wheelLocked = useRef(false);

  const maybeLoadNextBook = () => {
    if (loading || wheelLocked.current) {
      return;
    }

    wheelLocked.current = true;
    onNextBook();
    window.setTimeout(() => {
      wheelLocked.current = false;
    }, 900);
  };

  return (
    <section
      className="book-feed"
      onWheel={(event) => {
        if (event.deltaY > 70) {
          maybeLoadNextBook();
        }
      }}
      onTouchStart={(event) => {
        touchStartY.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        const endY = event.changedTouches[0]?.clientY;
        if (touchStartY.current !== null && touchStartY.current - endY > 60) {
          maybeLoadNextBook();
        }
        touchStartY.current = null;
      }}
    >
      <div className="feed-scroll-hint">{t.scrollHint}</div>

      {loading && !book ? (
        <div className="loading-spinner-container">
          <LoadingSpinner />
        </div>
      ) : null}

      {error && !book ? (
        <div className="error-message-container">
          <ErrorMessage message={error} customTitle={t.loadingErrorTitle} dict={t} />
        </div>
      ) : null}

      {book ? (
        <BookCard
          book={book}
          slides={slides}
          tests={tests}
          modes={modes}
          selectedModeId={selectedModeId}
          loading={loading}
          showTests={showTests}
          onRandomBook={onNextBook}
          onExplainMeaning={onExplainMeaning}
          onTakeTest={onTakeTest}
          onCreateVideo={onCreateVideo}
          onModeSelect={onModeSelect}
          t={t}
        />
      ) : null}
    </section>
  );
}
