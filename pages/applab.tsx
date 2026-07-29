import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import SEO from "@/components/SEO";
import type { Lang } from "@/i18n";
import {
  buildLocalizedHref,
  buildLocalizedPublicPath,
  getCurrentLang,
} from "@/lib/i18n/routing";

type AppLabStatus = "available" | "development" | "research" | "idea";

type AppLabProject = {
  id: string;
  name: string;
  icon: string;
  appIcon?: string;
  description: Record<Lang, string>;
  status: AppLabStatus;
  platforms: string[];
  href?: string;
};

const PROJECTS: AppLabProject[] = [
  {
    id: "draw-paws",
    name: "DrawPaws",
    icon: "🐾",
    appIcon: "/icons/app-lab/drawpaw.webp",
    description: {
      ru: "Интерактивная рисовалка, уроки, кисти, раскраска и творческие повторы.",
      en: "Interactive drawing, guided lessons, brushes, coloring, and creative replays.",
      he: "ציור אינטראקטיבי, שיעורים מודרכים, מברשות, צביעה ושחזורים יצירתיים.",
    },
    status: "available",
    platforms: ["Web", "PWA"],
    href: "/dog",
  },
  {
    id: "story-studio",
    name: "Story Studio",
    icon: "🎬",
    appIcon: "/icons/app-lab/storystudio.webp",
    description: {
      ru: "Студия визуальных историй с текстом, медиа, музыкой и экспортом.",
      en: "A visual story studio with text, media, music, and export tools.",
      he: "סטודיו לסיפורים חזותיים עם טקסט, מדיה, מוזיקה וכלי ייצוא.",
    },
    status: "available",
    platforms: ["Web", "PWA"],
    href: "/cats/studio",
  },
  {
    id: "raccoon-maps",
    name: "Raccoon Maps",
    icon: "🗺️",
    appIcon: "/icons/app-lab/raccoonmaps.webp",
    description: {
      ru: "Интерактивные карты стран, природы, культуры, флагов, погоды и еды.",
      en: "Interactive maps for countries, nature, culture, flags, weather, and food.",
      he: "מפות אינטראקטיביות של מדינות, טבע, תרבות, דגלים, מזג אוויר ואוכל.",
    },
    status: "available",
    platforms: ["Web", "PWA"],
    href: "/raccoons",
  },
  {
    id: "recipe-lab",
    name: "Recipe Lab",
    icon: "🥘",
    appIcon: "/icons/app-lab/recipelab.webp",
    description: {
      ru: "Коллекция рецептов из путешествий енотов с визуальными карточками.",
      en: "A collection of travel-inspired recipes with visual recipe cards.",
      he: "אוסף מתכונים בהשראת מסעות, עם כרטיסי מתכון חזותיים.",
    },
    status: "available",
    platforms: ["Web"],
    href: "/raccoons#kitchen",
  },
  {
    id: "video-studio",
    name: "Video Studio",
    icon: "📹",
    appIcon: "/icons/app-lab/videostudio.webp",
    description: {
      ru: "Отдельная среда для сборки коротких визуальных видео и экспериментов.",
      en: "A standalone workspace for short visual videos and creative experiments.",
      he: "סביבת עבודה עצמאית לסרטונים חזותיים קצרים ולניסויים יצירתיים.",
    },
    status: "development",
    platforms: ["Web", "Android"],
  },
  {
    id: "decision-assistant",
    name: "Decision Assistant",
    icon: "🧭",
    appIcon: "/icons/app-lab/decisionassistant.webp",
    description: {
      ru: "AI-инструмент для сравнения вариантов и исследования сложных решений.",
      en: "An AI tool for comparing options and exploring complex decisions.",
      he: "כלי AI להשוואת אפשרויות ולבחינה של החלטות מורכבות.",
    },
    status: "research",
    platforms: ["Web", "Android"],
  },
];

const COPY = {
  ru: {
    title: "AppLab",
    description:
      "Лаборатория самостоятельных приложений, AI-инструментов и творческих экспериментов LapLapLa.",
    kicker: "Лаборатория приложений LapLapLa",
    intro:
      "Здесь собраны уже работающие инструменты и проекты, которые проходят разработку и исследование.",
    note:
      "Сегодня здесь представлены первые проекты. Со временем AppLab превратится в коллекцию самостоятельных приложений LapLapLa для веба, PWA и Google Play.",
    back: "На главную",
    open: "Открыть",
    platforms: "Платформы",
    statuses: {
      available: "✅ Уже доступно",
      development: "🚧 В разработке",
      research: "🧪 Исследование",
      idea: "💡 Идея",
    },
  },
  en: {
    title: "AppLab",
    description:
      "LapLapLa's laboratory for standalone apps, AI tools, and creative experiments.",
    kicker: "LapLapLa application laboratory",
    intro:
      "Explore working tools alongside projects currently in development and research.",
    note:
      "These are the first AppLab projects. Over time, it will grow into a collection of standalone LapLapLa apps for the web, PWA, and Google Play.",
    back: "Back home",
    open: "Open",
    platforms: "Platforms",
    statuses: {
      available: "✅ Available",
      development: "🚧 In development",
      research: "🧪 Research",
      idea: "💡 Idea",
    },
  },
  he: {
    title: "AppLab",
    description:
      "המעבדה של LapLapLa לאפליקציות עצמאיות, כלי AI וניסויים יצירתיים.",
    kicker: "מעבדת האפליקציות של LapLapLa",
    intro:
      "כאן אפשר למצוא כלים פעילים לצד פרויקטים שנמצאים בפיתוח ובמחקר.",
    note:
      "אלה הפרויקטים הראשונים של AppLab. בהמשך היא תצמח לאוסף של אפליקציות LapLapLa עצמאיות לווב, ל-PWA ול-Google Play.",
    back: "חזרה לדף הבית",
    open: "לפתוח",
    platforms: "פלטפורמות",
    statuses: {
      available: "✅ זמין",
      development: "🚧 בפיתוח",
      research: "🧪 במחקר",
      idea: "💡 רעיון",
    },
  },
} satisfies Record<
  Lang,
  {
    title: string;
    description: string;
    kicker: string;
    intro: string;
    note: string;
    back: string;
    open: string;
    platforms: string;
    statuses: Record<AppLabStatus, string>;
  }
>;

export default function AppLabPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = COPY[lang];

  return (
    <>
      <SEO
        title={`${copy.title} — LapLapLa`}
        description={copy.description}
        path="/applab"
        lang={lang}
      />
      <main className="applab-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <header className="applab-hero">
          <Link
            className="applab-back"
            href={buildLocalizedPublicPath("/", lang)}
          >
            {copy.back}
          </Link>
          <p className="applab-kicker">{copy.kicker}</p>
          <h1>{copy.title}</h1>
          <p className="applab-intro">{copy.intro}</p>
          <p className="applab-note">{copy.note}</p>
        </header>

        <section className="applab-grid" aria-label={copy.kicker}>
          {PROJECTS.map((project) => (
            <article
              className={`applab-card applab-card--${project.status}`}
              key={project.id}
            >
              <div className="applab-card-heading">
                <span className="applab-icon" aria-hidden="true">
                  {project.icon}
                </span>
                <div>
                  <h2>{project.name}</h2>
                  <span className="applab-status">
                    {copy.statuses[project.status]}
                  </span>
                </div>
              </div>
              <p>{project.description[lang]}</p>
              <div className="applab-platforms">
                <span>{copy.platforms}</span>
                <ul>
                  {project.platforms.map((platform) => (
                    <li key={platform}>{platform}</li>
                  ))}
                </ul>
              </div>
              {project.status === "available" && project.href ? (
                <Link
                  className="applab-open"
                  href={buildLocalizedHref(project.href, lang)}
                >
                  {copy.open}
                </Link>
              ) : null}
              {project.appIcon ? (
                <Image
                  className="applab-brand-icon"
                  src={project.appIcon}
                  alt=""
                  width={132}
                  height={132}
                  sizes="(max-width: 600px) 96px, (max-width: 1100px) 112px, 132px"
                />
              ) : null}
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
