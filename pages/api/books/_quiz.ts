import { supabase } from "@/lib/supabase";

export interface StoredQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface StoredQuizPayload {
  title?: string;
  description?: string;
  quiz?: StoredQuizQuestion[];
  questions?: StoredQuizQuestion[];
}

export interface PublicQuizQuestion {
  question: string;
  options: string[];
}

export interface PublicQuizPayload {
  title: string;
  description: string;
  questions: PublicQuizQuestion[];
}

const parseQuizPayload = (value: unknown): StoredQuizPayload | null => {
  if (!value) {
    return null;
  }

  const parsed = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const payload = parsed as StoredQuizPayload;
  if (Array.isArray(payload.quiz)) return payload;
  if (Array.isArray((payload as any).questions)) {
    return { ...payload, quiz: (payload as any).questions };
  }
  return null;
};

export const sanitizeQuiz = (payload: StoredQuizPayload): PublicQuizPayload => ({
  title: typeof payload.title === "string" ? payload.title : "",
  description: typeof payload.description === "string" ? payload.description : "",
  questions: (payload.quiz || []).map((item: any) => {
    const question = typeof item?.question === "string" ? item.question : "";

    let options: string[] = [];

    // format A: answers[{text, correct}]
    if (Array.isArray(item?.answers)) {
      options = item.answers
        .map((a: any) => (typeof a?.text === "string" ? a.text : null))
        .filter(Boolean);
    }

    // format B: options[]
    else if (Array.isArray(item?.options)) {
      options = item.options.map((o: any) => String(o));
    }

    return {
      question,
      options,
    };
  }),
});

export const loadStoredQuiz = async (bookId: string | number) => {
  const { data, error } = await supabase
    .from("book_tests")
    .select("quiz")
    .eq("book_id", bookId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const payload = parseQuizPayload(data?.quiz);
  return payload;
};
