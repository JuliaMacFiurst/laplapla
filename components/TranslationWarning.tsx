import type { ContentTranslationMetadata } from "@/lib/contentTranslationMetadata";

type TranslationSubject = "content" | "book" | "story";

const MESSAGES: Record<TranslationSubject, Record<string, string>> = {
  content: {
    en: "This content hasn’t been translated yet, so the Russian original is shown. You can use your browser’s built-in translation if you prefer.",
    he: "התוכן הזה עדיין לא תורגם, ולכן מוצג המקור ברוסית. אפשר להשתמש בתרגום המובנה בדפדפן, אם תרצו.",
    fr: "⚠ Ce contenu n’a pas encore été traduit. Vous voyez la version russe.",
    es: "⚠ Este contenido aún no ha sido traducido. Estás viendo la versión en ruso.",
    ru: "",
  },
  book: {
    en: "This book hasn’t been translated yet, so the Russian original is shown. You can use your browser’s built-in translation if you prefer.",
    he: "הספר הזה עדיין לא תורגם, ולכן מוצג המקור ברוסית. אפשר להשתמש בתרגום המובנה בדפדפן, אם תרצו.",
    fr: "⚠ Ce livre n’a pas encore été traduit. Les capybaras y travaillent.",
    es: "⚠ Este libro aún no ha sido traducido. Los capibaras ya están trabajando en ello.",
    ru: "",
  },
  story: {
    en: "This story hasn’t been translated yet, so the Russian original is shown. You can use your browser’s built-in translation if you prefer.",
    he: "הסיפור הזה עדיין לא תורגם, ולכן מוצג המקור ברוסית. אפשר להשתמש בתרגום המובנה בדפדפן, אם תרצו.",
    fr: "⚠ Cette histoire n’a pas encore été traduite. Les capybaras y travaillent.",
    es: "⚠ Esta historia aún no ha sido traducida. Los capibaras ya están trabajando en ello.",
    ru: "",
  },
};

export function getMissingTranslationMessage(lang: string, subject: TranslationSubject = "content") {
  return MESSAGES[subject][lang] ?? MESSAGES[subject].en;
}

export const shouldShowTranslationWarning = (
  translation: ContentTranslationMetadata | null | undefined,
) => Boolean(
  translation &&
  translation.requestedLanguage !== "ru" &&
  !translation.native &&
  translation.sourceLanguage === "ru",
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
  if (translation && !shouldShowTranslationWarning(translation)) return null;
  const message = getMissingTranslationMessage(lang, subject);

  if (!message) return null;

  return (
    <div
      style={{
        background: "#d93025",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: 600,
        lineHeight: 1.4,
        marginBottom: "12px",
      }}
      role="alert"
    >
      {message}
    </div>
  );
}
