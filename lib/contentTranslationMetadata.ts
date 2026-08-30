import type { Lang } from "@/i18n";

export type ContentTranslationMetadata = {
  requestedLanguage: Lang;
  sourceLanguage: Lang;
  native: boolean;
};

export const getContentTranslationMetadata = (
  requestedLanguage: Lang,
  hasTranslationPayload: boolean,
): ContentTranslationMetadata => {
  // Payload existence intentionally preserves the current partial-translation semantics.
  const native = requestedLanguage === "ru" || hasTranslationPayload;
  return {
    requestedLanguage,
    sourceLanguage: native ? requestedLanguage : "ru",
    native,
  };
};
