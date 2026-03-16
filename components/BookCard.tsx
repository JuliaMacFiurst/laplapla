import StoryCarousel from "@/components/StoryCarousel";
import ModeButtons from "@/components/ModeButtons";
import type { Book, BookTest, ExplanationMode, Slide } from "@/types/types";
import type { dictionaries } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface BookCardProps {
  book: Book;
  slides: Slide[];
  tests: BookTest[];
  modes: ExplanationMode[];
  selectedModeId: string | number | null;
  loading?: boolean;
  showTests?: boolean;
  onRandomBook: () => void;
  onExplainMeaning: () => void;
  onTakeTest: () => void;
  onCreateVideo: () => void;
  onModeSelect: (modeId: string | number) => void;
  t: CapybaraPageDict;
}

export default function BookCard({
  book,
  slides,
  tests,
  modes,
  selectedModeId,
  loading,
  showTests,
  onRandomBook,
  onExplainMeaning,
  onTakeTest,
  onCreateVideo,
  onModeSelect,
  t,
}: BookCardProps) {
  const year = typeof book.year === "string" || typeof book.year === "number"
    ? String(book.year).trim()
    : "";
  const ageGroup = typeof book.age_group === "string" || typeof book.age_group === "number"
    ? String(book.age_group).trim()
    : "";
  const hasSecondaryMeta = Boolean(year || ageGroup);

  return (
    <article className="book-card">
      <div className="book-card-head">
        <h2 className="book-card-title">{book.title}</h2>
        {book.author ? <p className="book-card-author">{String(book.author)}</p> : null}
        {hasSecondaryMeta ? (
          <p className="book-card-meta">
            {[year, ageGroup].filter(Boolean).join(" • ")}
          </p>
        ) : null}
      </div>

      <StoryCarousel
        story={{
          id: String(book.id),
          title: book.title,
          slides,
        }}
        textClassName="story-carousel-text"
        emptyMessage={t.storyError}
      />

      <ModeButtons
        modes={modes}
        selectedModeId={selectedModeId}
        disabled={loading}
        onSelect={onModeSelect}
      />

      <div className="book-card-actions">
        <button type="button" className="feed-action-button" disabled={loading} onClick={onRandomBook}>
          {t.actions.randomBook}
        </button>
        <button type="button" className="feed-action-button" disabled={loading} onClick={onExplainMeaning}>
          {t.actions.explainMeaning}
        </button>
        <button type="button" className="feed-action-button" disabled={loading || tests.length === 0} onClick={onTakeTest}>
          {t.actions.takeTest}
        </button>
        <button type="button" className="feed-action-button" disabled={loading || slides.length === 0} onClick={onCreateVideo}>
          {t.actions.createVideo}
        </button>
      </div>

      {showTests ? (
        <div className="book-tests-panel">
          <h3 className="book-tests-title">{t.testTitle}</h3>
          {tests.length === 0 ? (
            <p className="book-tests-empty">{t.noTests}</p>
          ) : (
            <ol className="book-tests-list">
              {tests.map((test, index) => (
                <li key={String(test.id)} className="book-test-item">
                  <strong>{index + 1}. {test.question || t.untitledQuestion}</strong>
                  {Array.isArray(test.options) && test.options.length > 0 ? (
                    <p>{test.options.join(" / ")}</p>
                  ) : null}
                  {test.explanation ? <p>{test.explanation}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </article>
  );
}
