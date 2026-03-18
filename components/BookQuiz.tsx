import { useEffect, useMemo, useState } from "react";
import type { BookTest } from "@/types/types";
import type { dictionaries } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface BookQuizProps {
  bookId: string | number;
  test: BookTest | null;
  t: CapybaraPageDict;
}

interface AnswerResponse {
  correct: boolean;
  correctAnswerIndex?: number;
}

export default function BookQuiz({ bookId, test, t }: BookQuizProps) {
  const questions = test?.questions || [];
  const quizIdentity = useMemo(
    () => `${String(bookId)}:${String(test?.id ?? "none")}:${questions.length}`,
    [bookId, questions.length, test?.id],
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setRevealedCorrectIndex(null);
    setShowQuizResult(false);
    setCorrectAnswersCount(0);
    setIsCheckingAnswer(false);
    setAnswerError(null);
  }, [quizIdentity]);

  const currentQuestion = questions[currentQuestionIndex];
  const hasAnswered = selectedOptionIndex !== null;

  const handleSelectOption = async (optionIndex: number) => {
    if (!currentQuestion || hasAnswered || isCheckingAnswer || !test) {
      return;
    }

    setIsCheckingAnswer(true);
    setAnswerError(null);

    try {
      const response = await fetch("/api/books/test/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          testId: test.id,
          questionIndex: currentQuestionIndex,
          selectedIndex: optionIndex,
        }),
      });

      const result = (await response.json()) as AnswerResponse & { error?: string };
      if (!response.ok) {
        throw new Error(result.error || t.errors.testsLoad);
      }

      setSelectedOptionIndex(optionIndex);
      setRevealedCorrectIndex(
        typeof result.correctAnswerIndex === "number" ? result.correctAnswerIndex : optionIndex,
      );

      if (result.correct) {
        setCorrectAnswersCount((prev) => prev + 1);
      }
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : t.errors.testsLoad);
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex >= questions.length - 1) {
      setShowQuizResult(true);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedOptionIndex(null);
    setRevealedCorrectIndex(null);
    setAnswerError(null);
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setRevealedCorrectIndex(null);
    setShowQuizResult(false);
    setCorrectAnswersCount(0);
    setAnswerError(null);
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

  if (!test || questions.length === 0) {
    return <p className="book-tests-empty">{t.quiz.unavailable}</p>;
  }

  return (
    <div className="quiz-container">
      {test.description ? <p className="quiz-description">{test.description}</p> : null}
      {!showQuizResult && currentQuestion ? (
        <>
          <p className="quiz-progress">
            {t.quiz.questionCounter
              .replace("{current}", String(currentQuestionIndex + 1))
              .replace("{total}", String(questions.length))}
          </p>
          <h4 className="quiz-question">{currentQuestion.question || t.untitledQuestion}</h4>
          <div className="quiz-options">
            {currentQuestion.options.map((option, optionIndex) => {
              const isCorrect = hasAnswered && optionIndex === revealedCorrectIndex;
              const isWrong =
                hasAnswered &&
                optionIndex === selectedOptionIndex &&
                optionIndex !== revealedCorrectIndex;
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
                  disabled={hasAnswered || isCheckingAnswer}
                  onClick={() => void handleSelectOption(optionIndex)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {answerError ? <p className="quiz-feedback">{answerError}</p> : null}
          {hasAnswered ? (
            <p className="quiz-feedback">
              {selectedOptionIndex === revealedCorrectIndex ? t.quiz.correct : t.quiz.incorrect}
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
  );
}
