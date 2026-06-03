const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "being", "can", "could", "does", "from", "have", "how", "into",
  "forever", "more", "most", "only", "other", "should", "some", "such", "than", "that", "their", "there", "these",
  "they", "this", "through", "very", "what", "when", "where", "which", "while", "why", "with", "would", "your",
  "будет", "были", "было", "быть", "ведь", "всего", "где", "даже", "если", "зачем", "как", "когда", "который",
  "каждый", "может", "очень", "почему", "после", "потом", "потому", "просто", "сегодня", "также", "только", "чтобы", "этого",
  "вчера",
  "этот", "about", "איך", "אחרי", "איפה", "אלה", "אבל", "בגלל", "הוא", "היא", "יותר", "למה", "מאוד",
  "מה", "מתי", "עם", "של", "שהוא", "שלה", "שלהם", "שזה",
]);

const WEAK_WORDS = new Set([
  "answer", "example", "explain", "fact", "forbids", "idea", "question", "slide", "story", "thing", "works",
  "вопрос", "история", "ответ", "пример", "работает", "слайд", "факт",
]);

const normalizeToken = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "").trim();

const looksLikeWeakConcept = (word: string) =>
  /(?:ing|ed|ize|ise|ifies|says|works)$/i.test(word) ||
  /(?:овать|евать|ывать|ивать|аться|яться|ится|атся|ется|утся|ются|или|ала|яли|ишь|ешь|ает|яет|уют|ают|ого|ему|ому|ыми|ими|ая|яя|ое|ее|ый|ий)$/u.test(word);

export function extractSlideConcepts(
  text: string,
  preferredKeywords: string[] = [],
  limit = 2,
) {
  const preferred = preferredKeywords
    .flatMap((keyword) => keyword.split(/\s+/))
    .map(normalizeToken)
    .filter((word) => word.length >= 3);
  const uniquePreferred = Array.from(new Set(preferred));
  if (uniquePreferred.length > 0) {
    return uniquePreferred.slice(0, Math.max(1, limit));
  }

  const textTokens = (text.match(/[\p{L}\p{N}-]+/gu) || [])
    .map(normalizeToken)
    .filter((word) => word.length >= 4)
    .filter((word) => !STOP_WORDS.has(word) && !WEAK_WORDS.has(word))
    .filter((word) => !looksLikeWeakConcept(word));

  return Array.from(new Set(textTokens)).slice(0, Math.max(1, limit));
}

export function buildShortSlideMediaQuery(
  prefix: string,
  text: string,
  preferredKeywords: string[] = [],
) {
  const normalizedPrefix = prefix.trim().replace(/\s+/g, " ");
  const prefixTokens = new Set(normalizedPrefix.toLowerCase().split(/\s+/));
  const concepts = extractSlideConcepts(text, preferredKeywords)
    .filter((word) => !prefixTokens.has(word.toLowerCase()))
    .slice(0, 2);

  return [normalizedPrefix, ...concepts].filter(Boolean).join(" ").trim();
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), Math.max(1, items.length)) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
