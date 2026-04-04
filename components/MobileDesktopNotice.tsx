import type { Lang } from "@/i18n";

const content = {
  ru: {
    badge: "Только для десктопа",
    title: "Эта страница пока недоступна на мобильных устройствах",
    text: "Сейчас этот раздел доступен только в десктопной версии сайта. Полный мобильный функционал появится в приложении LapLapLa уже в ближайшее время.",
  },
  en: {
    badge: "Desktop only",
    title: "This page is not available on mobile yet",
    text: "This section is currently available only in the desktop version of the site. Full mobile functionality will be released soon in the LapLapLa app.",
  },
  he: {
    badge: "למחשב בלבד",
    title: "העמוד הזה עדיין לא זמין במובייל",
    text: "כרגע החלק הזה זמין רק בגרסת הדסקטופ של האתר. בקרוב תצא אפליקציית LapLapLa עם פונקציונליות מלאה למובייל.",
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
