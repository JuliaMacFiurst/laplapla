import type { Lang } from "@/i18n";

export type ContentTranslationMetadata = {
  requestedLanguage: Lang;
  sourceLanguage: Lang;
  native: boolean;
  hasRussianFallback: boolean;
};

export const hasContent = (value: unknown): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasContent);
  return value !== null && value !== undefined;
};

export const needsTranslationFallback = (baseValue: unknown, translatedValue: unknown) =>
  hasContent(baseValue) && !hasContent(translatedValue);

export const sequenceNeedsTranslationFallback = (
  baseItems: unknown,
  translatedItems: unknown,
  getValue: (item: unknown) => unknown = (item) => item,
) => Array.isArray(baseItems) && baseItems.some((item, index) =>
  needsTranslationFallback(
    getValue(item),
    getValue(Array.isArray(translatedItems) ? translatedItems[index] : undefined),
  ),
);

export const getContentTranslationMetadata = (
  requestedLanguage: Lang,
  hasTranslationPayload: boolean,
  usedRussianFallback = false,
): ContentTranslationMetadata => {
  const native = requestedLanguage === "ru" || hasTranslationPayload;
  const hasRussianFallback = requestedLanguage !== "ru" && (
    !hasTranslationPayload || usedRussianFallback
  );
  return {
    requestedLanguage,
    sourceLanguage: native ? requestedLanguage : "ru",
    native,
    hasRussianFallback,
  };
};
