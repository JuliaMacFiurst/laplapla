import { useEffect, useMemo, useState } from "react";
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
  showRandomBookAction?: boolean;
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
  showRandomBookAction = true,
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
  const activeTest = useMemo(
    () => tests.find((test) => Array.isArray(test.questions) && test.questions.length > 0) || null,
    [tests],
  );
  const questions = activeTest?.questions || [];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const currentQuestion = questions[currentQuestionIndex];
  const currentCorrectIndex = currentQuestion?.correctIndex ?? -1;
  const hasAnswered = selectedOptionIndex !== null;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setShowQuizResult(false);
    setCorrectAnswersCount(0);
  }, [book.id, selectedModeId, showTests, activeTest?.id]);

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion || hasAnswered) {
      return;
    }

    setSelectedOptionIndex(optionIndex);
    if (optionIndex === currentCorrectIndex) {
      setCorrectAnswersCount((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex >= questions.length - 1) {
      setShowQuizResult(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedOptionIndex(null);
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setShowQuizResult(false);
    setCorrectAnswersCount(0);
  };

  const capybaraResultMessage = useMemo(() => {
    const wrongAnswersCount = questions.length - correctAnswersCount;

    if (questions.length > 0 && correctAnswersCount === questions.length) {
      return t.quiz.results.perfect;
    }

    if (wrongAnswersCount === 2) {
      return t.quiz.results.twoWrong;
    }

    return t.quiz.results.needsRetry;
  }, [correctAnswersCount, questions.length, t.quiz.results.needsRetry, t.quiz.results.perfect, t.quiz.results.twoWrong]);

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
          id: `${String(book.id)}-${String(selectedModeId ?? "default")}`,
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
        {showRandomBookAction ? (
          <button type="button" className="feed-action-button" disabled={loading} onClick={onRandomBook}>
            {t.actions.randomBook}
          </button>
        ) : null}
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
          <h3 className="book-tests-title">{activeTest?.title || t.testTitle}</h3>
          {!activeTest || questions.length === 0 ? (
            <p className="book-tests-empty">{t.quiz.unavailable}</p>
          ) : (
            <div className="quiz-container">
              {activeTest.description ? <p className="quiz-description">{activeTest.description}</p> : null}
              {!showQuizResult && currentQuestion ? (
                <>
                  <p className="quiz-progress">
                    {t.quiz.questionCounter
                      .replace("{current}", String(currentQuestionIndex + 1))
                      .replace("{total}", String(questions.length))}
                  </p>
                  <h4 className="quiz-question">
                    {currentQuestion.question || t.untitledQuestion}
                  </h4>
                  <div className="quiz-options">
                    {currentQuestion.options.map((option, optionIndex) => {
                      const isCorrect = hasAnswered && optionIndex === currentCorrectIndex;
                      const isWrong = hasAnswered && optionIndex === selectedOptionIndex && optionIndex !== currentCorrectIndex;
                      const optionClassName = [
                        "quiz-option",
                        isCorrect ? "quiz-option-correct" : "",
                        isWrong ? "quiz-option-wrong" : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <button
                          key={`${currentQuestionIndex}-${optionIndex}`}
                          type="button"
                          className={optionClassName}
                          disabled={hasAnswered}
                          onClick={() => handleSelectOption(optionIndex)}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {hasAnswered ? (
                    <p className="quiz-feedback">
                      {selectedOptionIndex === currentCorrectIndex ? t.quiz.correct : t.quiz.incorrect}
                    </p>
                  ) : null}
                  {hasAnswered ? (
                    <button type="button" className="quiz-next-button" onClick={handleNextQuestion}>
                      {currentQuestionIndex === questions.length - 1 ? t.quiz.showResults : t.quiz.nextQuestion}
                    </button>
                  ) : null}
                </>
              ) : null}

              {showQuizResult ? (
                <div className="quiz-result-modal" role="dialog" aria-modal="false">
                  <p className="quiz-result-score">
                    {t.quiz.resultSummary
                      .replace("{correct}", String(correctAnswersCount))
                      .replace("{total}", String(questions.length))}
                  </p>
                  <p className="quiz-result-message">{capybaraResultMessage}</p>
                  <button type="button" className="quiz-next-button" onClick={handleRestartQuiz}>
                    {t.quiz.tryAgain}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
