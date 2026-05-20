const HEBREW_RE = /[\u0590-\u05FF]/;
const LTR_RE = /[A-Za-z0-9]/;
const LTR_RUN_RE =
  /[A-Za-z0-9][A-Za-z0-9 @#&%+=_[\]{}<>|~^`$€£¥₪.,:;!?'"()\\/.-]*(?=[\s\u0590-\u05FF]|$)/g;

const LRI = "\u2066";
const PDI = "\u2069";

type BidiTree =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly BidiTree[]
  | { readonly [key: string]: BidiTree };

export function isolateMixedBidiText(text: string, lang: string) {
  if (lang !== "he" || !HEBREW_RE.test(text) || !LTR_RE.test(text)) {
    return text;
  }

  return text.replace(LTR_RUN_RE, (match) => {
    if (!LTR_RE.test(match) || match.includes(LRI) || match.includes(PDI)) {
      return match;
    }

    return `${LRI}${match}${PDI}`;
  });
}

export function isolateMixedBidiTree<T extends BidiTree>(value: T, lang: string): T {
  if (typeof value === "string") {
    return isolateMixedBidiText(value, lang) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => isolateMixedBidiTree(item, lang)) as unknown as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, isolateMixedBidiTree(item, lang)]),
  ) as T;
}
