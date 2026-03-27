type TranslationSubject = "content" | "book" | "story";

const MESSAGES: Record<TranslationSubject, Record<string, string>> = {
  content: {
    en: "⚠ This content has not been translated yet. You are seeing the Russian version.",
    he: "⚠ התוכן הזה עדיין לא תורגם. מוצגת הגרסה ברוסית.",
    fr: "⚠ Ce contenu n’a pas encore été traduit. Vous voyez la version russe.",
    es: "⚠ Este contenido aún no ha sido traducido. Estás viendo la versión en ruso.",
    ru: "",
  },
  book: {
    en: "⚠ This book is not translated yet. Capybaras are working on it.",
    he: "⚠ הספר הזה עדיין לא תורגם. הקפיברות כבר עובדות על זה.",
    fr: "⚠ Ce livre n’a pas encore été traduit. Les capybaras y travaillent.",
    es: "⚠ Este libro aún no ha sido traducido. Los capibaras ya están trabajando en ello.",
    ru: "",
  },
  story: {
    en: "⚠ This story is not translated yet. Capybaras are working on it.",
    he: "⚠ הסיפור הזה עדיין לא תורגם. הקפיברות כבר עובדות על זה.",
    fr: "⚠ Cette histoire n’a pas encore été traduite. Les capybaras y travaillent.",
    es: "⚠ Esta historia aún no ha sido traducida. Los capibaras ya están trabajando en ello.",
    ru: "",
  },
};

export function getMissingTranslationMessage(lang: string, subject: TranslationSubject = "content") {
  return MESSAGES[subject][lang] ?? MESSAGES[subject].en;
}

export default function TranslationWarning({
  lang,
  subject = "content",
}: {
  lang: string;
  subject?: TranslationSubject;
}) {
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
