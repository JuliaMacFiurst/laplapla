import type { BookTest, BookTestQuestion } from "@/types/types";

type RawRecord = Record<string, unknown>;

const parseJson = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const asRecord = (value: unknown): RawRecord | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : null;

const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];

const normalizeQuestion = (rawQuestion: unknown): BookTestQuestion | null => {
  const questionRecord = asRecord(parseJson(rawQuestion));
  if (!questionRecord) {
    return null;
  }

  const question = typeof questionRecord.question === "string" ? questionRecord.question.trim() : "";
  if (!question) {
    return null;
  }

  if (Array.isArray(questionRecord.answers)) {
    const answers = questionRecord.answers
      .map((answer) => asRecord(answer))
      .filter((answer): answer is RawRecord => Boolean(answer));

    const options = answers.map((answer) => String(answer.text || "").trim()).filter(Boolean);
    const correctIndex = answers.findIndex((answer) => answer.correct === true);

    if (options.length === 0 || correctIndex < 0) {
      return null;
    }

    return {
      question,
      options,
      correctIndex,
    };
  }

  const options = asStringArray(questionRecord.options);
  const correctIndexRaw = questionRecord.correct ?? questionRecord.correctIndex ?? questionRecord.correctAnswerIndex;
  const correctIndex = typeof correctIndexRaw === "number" ? correctIndexRaw : Number(correctIndexRaw);

  if (options.length === 0 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return null;
  }

  return {
    question,
    options,
    correctIndex,
  };
};

const extractQuestions = (row: RawRecord): BookTestQuestion[] => {
  const parsedQuiz = parseJson(row.quiz);
  const parsedQuestions = parseJson(row.questions);

  const nestedQuestions =
    (asRecord(parsedQuiz)?.questions as unknown[] | undefined) ||
    (asRecord(parsedQuiz)?.quiz as unknown[] | undefined) ||
    (asRecord(parsedQuestions)?.questions as unknown[] | undefined) ||
    (asRecord(parsedQuestions)?.quiz as unknown[] | undefined) ||
    (Array.isArray(parsedQuestions) ? parsedQuestions : undefined) ||
    (Array.isArray(parsedQuiz) ? parsedQuiz : undefined);

  if (Array.isArray(nestedQuestions)) {
    return nestedQuestions
      .map(normalizeQuestion)
      .filter((question): question is BookTestQuestion => Boolean(question));
  }

  const legacyQuestion = normalizeQuestion({
    question: row.question,
    options: parseJson(row.options),
    correct: row.correct,
    correctIndex: row.correctIndex,
    correctAnswerIndex: row.correctAnswerIndex,
  });

  return legacyQuestion ? [legacyQuestion] : [];
};

export const normalizeBookTests = (rows: unknown[]): BookTest[] =>
  rows
    .map((rawRow) => asRecord(parseJson(rawRow)))
    .filter((row): row is RawRecord => Boolean(row))
    .map((row, index) => {
      const questions = extractQuestions(row);
      return {
        id: typeof row.id === "string" || typeof row.id === "number" ? row.id : `quiz-${index}`,
        book_id: typeof row.book_id === "string" || typeof row.book_id === "number" ? row.book_id : "",
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : "",
        questions,
      } satisfies BookTest;
    })
    .filter((test) => Array.isArray(test.questions) && test.questions.length > 0);
