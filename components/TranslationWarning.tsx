"use client";

import { useId, useReducer } from "react";
import type { ContentTranslationMetadata } from "@/lib/contentTranslationMetadata";
import styles from "./TranslationWarning.module.css";

type TranslationSubject = "content" | "book" | "story";

const MESSAGES: Record<TranslationSubject, Record<string, string>> = {
  content: {
    en: "Some of this content is still shown in Russian. You can use your browser’s built-in translation if you prefer.",
    he: "חלק מהתוכן עדיין מוצג ברוסית. אפשר להשתמש בתרגום המובנה בדפדפן, אם תרצו.",
    fr: "⚠ Ce contenu n’a pas encore été traduit. Vous voyez la version russe.",
    es: "⚠ Este contenido aún no ha sido traducido. Estás viendo la versión en ruso.",
    ru: "",
  },
  book: {
    en: "Some of this book is still shown in Russian. You can use your browser’s built-in translation if you prefer.",
    he: "חלק מהספר עדיין מוצג ברוסית. אפשר להשתמש בתרגום המובנה בדפדפן, אם תרצו.",
    fr: "⚠ Ce livre n’a pas encore été traduit. Les capybaras y travaillent.",
    es: "⚠ Este libro aún no ha sido traducido. Los capibaras ya están trabajando en ello.",
    ru: "",
  },
  story: {
    en: "Some of this story is still shown in Russian. You can use your browser’s built-in translation if you prefer.",
    he: "חלק מהסיפור עדיין מוצג ברוסית. אפשר להשתמש בתרגום המובנה בדפדפן, אם תרצו.",
    fr: "⚠ Cette histoire n’a pas encore été traduite. Les capybaras y travaillent.",
    es: "⚠ Esta historia aún no ha sido traducida. Los capibaras ya están trabajando en ello.",
    ru: "",
  },
};

export function getMissingTranslationMessage(lang: string, subject: TranslationSubject = "content") {
  return MESSAGES[subject][lang] ?? MESSAGES[subject].en;
}

const TRANSLATION_HELP = {
  en: {
    show: "How to translate",
    hide: "Hide instructions",
    chrome: "Chrome / Android: look for Translate in your browser’s page menu.",
    safari: "Safari / iPhone / iPad: look for Translate in the page menu.",
    fallback: "On many phones, you can also select the Russian text and choose Translate. If the app does not show a browser menu, open this page in your browser first.",
  },
  he: {
    show: "איך לתרגם",
    hide: "להסתיר הוראות",
    chrome: "Chrome / Android: חפשו את האפשרות תרגום בתפריט הדף של הדפדפן.",
    safari: "Safari / iPhone / iPad: חפשו את האפשרות תרגום בתפריט הדף.",
    fallback: "בטלפונים רבים אפשר גם לסמן את הטקסט ברוסית ולבחור תרגום. אם האפליקציה אינה מציגה תפריט דפדפן, פתחו תחילה את הדף בדפדפן.",
  },
} as const;

const DISMISS_LABELS = {
  en: "Dismiss translation notice",
  he: "סגירת הודעת התרגום",
  ru: "Закрыть уведомление о переводе",
} as const;

export function getTranslationHelpCopy(lang: string) {
  return lang === "he" ? TRANSLATION_HELP.he : TRANSLATION_HELP.en;
}

export const toggleTranslationHelp = (expanded: boolean) => !expanded;

export type TranslationWarningUiState = {
  expanded: boolean;
  dismissed: boolean;
};

export type TranslationWarningUiAction = "toggle-help" | "dismiss";

export function reduceTranslationWarningUi(
  state: TranslationWarningUiState,
  action: TranslationWarningUiAction,
): TranslationWarningUiState {
  if (action === "dismiss") return { expanded: false, dismissed: true };
  return { ...state, expanded: !state.expanded };
}

export function getTranslationWarningDismissLabel(lang: string) {
  if (lang === "he") return DISMISS_LABELS.he;
  if (lang === "ru") return DISMISS_LABELS.ru;
  return DISMISS_LABELS.en;
}

export const shouldShowTranslationWarning = (
  translation: ContentTranslationMetadata | null | undefined,
) => Boolean(
  translation &&
  translation.requestedLanguage !== "ru" &&
  translation.hasRussianFallback,
);

export default function TranslationWarning({
  lang,
  subject = "content",
  translation,
}: {
  lang: string;
  subject?: TranslationSubject;
  translation?: ContentTranslationMetadata;
}) {
  const [{ expanded, dismissed }, dispatch] = useReducer(reduceTranslationWarningUi, {
    expanded: false,
    dismissed: false,
  });
  const instructionsId = useId();

  if (dismissed) return null;
  if (translation && !shouldShowTranslationWarning(translation)) return null;
  const message = getMissingTranslationMessage(lang, subject);

  if (!message) return null;

  return (
    <div className={styles.warning} role="note">
      <button
        type="button"
        className={styles.close}
        aria-label={getTranslationWarningDismissLabel(lang)}
        onClick={() => dispatch("dismiss")}
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className={styles.message}>{message}</div>
      <button
        type="button"
        className={styles.disclosure}
        aria-expanded={expanded}
        aria-controls={instructionsId}
        onClick={() => dispatch("toggle-help")}
      >
        {expanded ? getTranslationHelpCopy(lang).hide : getTranslationHelpCopy(lang).show}
      </button>
      {expanded ? (
        <div id={instructionsId} className={styles.instructions}>
          <p>{getTranslationHelpCopy(lang).chrome}</p>
          <p>{getTranslationHelpCopy(lang).safari}</p>
          <p>{getTranslationHelpCopy(lang).fallback}</p>
        </div>
      ) : null}
    </div>
  );
}
