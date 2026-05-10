import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { BookTest } from "@/types/types";
import type { dictionaries } from "@/i18n";

type CapybaraPageDict = (typeof dictionaries)["ru"]["capybaras"]["capybaraPage"];

interface BookQuizProps {
  bookId: string | number;
  test: BookTest | null;
  t: CapybaraPageDict;
  variant?: "default" | "mobile-fullscreen";
}

const REDUNDANT_QUIZ_DESCRIPTIONS = new Set([
  "понял ли ты, о чём эта история?",
  "понял ли ты, о чем эта история?",
  "did you understand what this story is about?",
  "did you get what this story is about?",
  "האם הבנת על מה הסיפור הזה?",
  "הבנת על מה הסיפור הזה?",
]);

interface AnswerResponse {
  correct: boolean;
  correctAnswerIndex?: number;
}

type QuizResultMedia =
  | {
      mediaType: "gif" | "image";
      url: string;
      alt: string;
    }
  | null;

export default function BookQuiz({ bookId, test, t, variant = "default" }: BookQuizProps) {
  const normalizedQuiz = useMemo(() => {
    if (test && Array.isArray(test.questions)) {
      return test;
    }

    const nestedQuiz = test?.quiz;
    if (
      nestedQuiz &&
      typeof nestedQuiz === "object" &&
      !Array.isArray(nestedQuiz) &&
      Array.isArray((nestedQuiz as { questions?: unknown[] }).questions)
    ) {
      return {
        ...test,
        questions: (nestedQuiz as { questions: BookTest["questions"] }).questions,
      } as BookTest;
    }

    return null;
  }, [test]);

  const validQuestions = useMemo(() => {
    const nextValidQuestions = (normalizedQuiz?.questions || []).filter((q) =>
      q &&
      typeof q.question === "string" &&
      q.question.trim().length > 0 &&
      Array.isArray(q.options) &&
      q.options.length > 0,
    );

    return nextValidQuestions;
  }, [normalizedQuiz]);

  const questions = validQuestions;
  const quizIdentity = useMemo(
    () => `${String(bookId)}:${String(normalizedQuiz?.id ?? "none")}:${questions.length}`,
    [bookId, normalizedQuiz?.id, questions.length],
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [resultMedia, setResultMedia] = useState<QuizResultMedia>(null);
  const [isResultMediaLoading, setIsResultMediaLoading] = useState(false);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setRevealedCorrectIndex(null);
    setShowQuizResult(false);
    setCorrectAnswersCount(0);
    setIsCheckingAnswer(false);
    setAnswerError(null);
    setResultMedia(null);
    setIsResultMediaLoading(false);
  }, [quizIdentity]);

  const currentQuestion = questions[currentQuestionIndex];
  const hasAnswered = selectedOptionIndex !== null;
  const quizDescription = normalizedQuiz?.description?.trim();
  const shouldShowQuizDescription = Boolean(
    quizDescription &&
    !REDUNDANT_QUIZ_DESCRIPTIONS.has(quizDescription.toLocaleLowerCase()),
  );

  const handleSelectOption = async (optionIndex: number) => {
    if (!currentQuestion || hasAnswered || isCheckingAnswer || !normalizedQuiz) {
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
          testId: normalizedQuiz.id,
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
      return "Капибара думает, что ты можешь создать свой книжный клуб!";
    }

    if (wrongAnswersCount === 2) {
      return "Капибара думает, что ты читал книгу давно и немного подзабыл";
    }

    if (correctAnswersCount < 3) {
      return "Капибара думает, что стоит перечитать книгу";
    }

    return "Капибара думает, что стоит перечитать книгу";
  }, [correctAnswersCount, questions.length]);

  const resultMood = useMemo(() => {
    const wrongAnswersCount = questions.length - correctAnswersCount;

    if (questions.length > 0 && wrongAnswersCount === 0) {
      return {
        mood: "happy",
        keywords: ["happy", "smiling", "celebration"],
        alt: "Happy capybara",
      };
    }

    if (wrongAnswersCount <= 3) {
      return {
        mood: "serious",
        keywords: ["serious", "thoughtful", "focused"],
        alt: "Serious capybara",
      };
    }

    return {
      mood: "sad",
      keywords: ["sad", "upset", "tears"],
      alt: "Sad capybara",
    };
  }, [correctAnswersCount, questions.length]);

  useEffect(() => {
    if (!showQuizResult) {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      setIsResultMediaLoading(true);
      setResultMedia(null);

      const keywords = ["capybara", ...resultMood.keywords].join(",");

      try {
        try {
          const gifResponse = await fetch(`/api/capybara-gifs?keywords=${encodeURIComponent(keywords)}&mood=${encodeURIComponent(resultMood.mood)}`, {
            signal: controller.signal,
          });

          if (gifResponse.ok) {
            const gifs = (await gifResponse.json()) as Array<{ gifUrl?: string }>;
            const gifUrl = gifs.find((item) => typeof item.gifUrl === "string" && item.gifUrl)?.gifUrl;

            if (gifUrl) {
              setResultMedia({
                mediaType: "gif",
                url: gifUrl,
                alt: resultMood.alt,
              });
              return;
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
        }

        try {
          const imageResponse = await fetch(`/api/capybara-images?keywords=${encodeURIComponent(keywords)}&mood=${encodeURIComponent(resultMood.mood)}`, {
            signal: controller.signal,
          });

          if (!imageResponse.ok) {
            throw new Error("Failed to fetch result image");
          }

          const images = (await imageResponse.json()) as Array<{ imageUrl?: string; imageAlt?: string }>;
          const image = images.find((item) => typeof item.imageUrl === "string" && item.imageUrl);

          if (image?.imageUrl) {
            setResultMedia({
              mediaType: "image",
              url: image.imageUrl,
              alt: image.imageAlt || resultMood.alt,
            });
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsResultMediaLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [resultMood.alt, resultMood.keywords, resultMood.mood, showQuizResult]);

  if (!normalizedQuiz || questions.length === 0) {
    return <p className="book-tests-empty">Тест пока недоступен</p>;
  }

  return (
    <div className={`quiz-container${variant === "mobile-fullscreen" ? " quiz-container-mobile-fullscreen" : ""}`}>
      {shouldShowQuizDescription ? <p className="quiz-description">{quizDescription}</p> : null}
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
          {resultMedia ? (
            <div className="quiz-result-media">
              <Image
                src={resultMedia.url}
                alt={resultMedia.alt}
                className="quiz-result-media-asset"
                width={512}
                height={512}
                unoptimized
              />
            </div>
          ) : isResultMediaLoading ? (
            <div className="quiz-result-media quiz-result-media-loading" aria-hidden="true" />
          ) : null}
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
