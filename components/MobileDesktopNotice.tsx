import type { Lang } from "@/i18n";

const content = {
  ru: {
    badge: "Только для десктопа",
    title: "Эта страница пока недоступна на мобильных устройствах",
    text: "Этот рабочий экран предназначен для большого дисплея. На телефоне вернитесь в редактор и используйте доступные там инструменты.",
  },
  en: {
    badge: "Desktop only",
    title: "This page is not available on mobile yet",
    text: "This workspace is designed for a larger display. On a phone, return to the editor and use the tools available there.",
  },
  he: {
    badge: "למחשב בלבד",
    title: "העמוד הזה עדיין לא זמין במובייל",
    text: "סביבת העבודה הזו מיועדת למסך גדול. בטלפון, חזרו לעורך והשתמשו בכלים הזמינים בו.",
  },
} satisfies Record<Lang, { badge: string; title: string; text: string }>;

export default function MobileDesktopNotice({ lang }: { lang: Lang }) {
  const t = content[lang] ?? content.ru;

  return (
    <main className="mobile-desktop-notice" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="mobile-desktop-notice__card">
        <div className="mobile-desktop-notice__badge">{t.badge}</div>
        <h1 className="mobile-desktop-notice__title">{t.title}</h1>
        <p className="mobile-desktop-notice__text">{t.text}</p>
      </div>
    </main>
  );
}
