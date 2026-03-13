const MESSAGES: Record<string, string> = {
  en: "⚠ This content has not been translated yet. You are seeing the Russian version.",
  he: "⚠ התוכן הזה עדיין לא תורגם. מוצגת הגרסה ברוסית.",
  fr: "⚠ Ce contenu n’a pas encore été traduit. Vous voyez la version russe.",
  es: "⚠ Este contenido aún no ha sido traducido. Estás viendo la versión en ruso.",
  ru: "",
};

export function getMissingTranslationMessage(lang: string) {
  return MESSAGES[lang] ?? MESSAGES.en;
}

export default function TranslationWarning({ lang }: { lang: string }) {
  const message = getMissingTranslationMessage(lang);

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
