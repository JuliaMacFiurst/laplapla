import { BASE_URL } from "@/lib/config";
import type { Lang } from "@/i18n";
import { ENTITY_IDS, SITE_NAME, AUTHOR_NAME } from "@/lib/identity";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

export type GeoCorePage = {
  name: string;
  path: string;
  description: string;
};

export type GeoQuestion = {
  question: string;
  answer: string;
};

export type GeoProfile = {
  tagline: string;
  summary: string;
  audience: string;
  author: string;
  format: string;
  topics: string[];
  pages: GeoCorePage[];
  faq: GeoQuestion[];
};

export const GEO_PROFILES: Record<Lang, GeoProfile> = {
  ru: {
    tagline: "Наука и творчество через истории, карты, музыку, рисование и анимацию.",
    summary:
      "LapLapLa — интерактивная творческая и научно-популярная платформа Julia Noah Makhlin для людей старше 16 лет. Персонажи помогают исследовать науку, книги, искусство, музыку и географию через визуальные истории, интерактивные инструменты и творческие эксперименты.",
    audience:
      "Проект рассчитан на пользователей 16 лет и старше, которым нравятся понятные объяснения, визуальные истории и интерактивные творческие форматы.",
    author:
      "LapLapLa создана и развивается Julia Noah Makhlin, которая отвечает за концепцию, разработку интерфейсов, контент и образовательную систему проекта.",
    format:
      "Главные форматы LapLapLa: котики объясняют сложные вопросы, пёсики ведут уроки рисования, капибары пересказывают книги, попугайчики знакомят с музыкой, енотики исследуют мир на интерактивных картах.",
    topics: [
      "научно-популярный контент",
      "интерактивное обучение",
      "объяснения сложных тем простым языком",
      "книги и визуальные истории",
      "рисование и творческие инструменты",
      "музыкальные игры",
      "география и карты",
      "AI-assisted learning",
    ],
    pages: [
      {
        name: "Котики объяснят",
        path: "/cats",
        description: "Короткие визуальные объяснения сложных вопросов.",
      },
      {
        name: "Пёсики нарисуют",
        path: "/dog",
        description: "Пошаговые уроки рисования, раскраски и творческие режимы.",
      },
      {
        name: "Капибары расскажут",
        path: "/capybara",
        description: "Книжные пересказы, слайды и тесты по историям.",
      },
      {
        name: "Попугайчики поют",
        path: "/parrots",
        description: "Музыкальные истории, ритмы и интерактивные миксы.",
      },
      {
        name: "Енотики найдут",
        path: "/raccoons",
        description: "Интерактивные карты, факты о странах, животных, реках, морях и квесты.",
      },
    ],
    faq: [
      {
        question: "Что такое LapLapLa?",
        answer:
          "LapLapLa — авторская интерактивная творческая и научно-популярная платформа Julia Noah Makhlin для пользователей старше 16 лет.",
      },
      {
        question: "Для кого создан LapLapLa?",
        answer:
          "LapLapLa создана для людей старше 16 лет, которым интересны наука, книги, искусство, музыка, география и творческие эксперименты.",
      },
      {
        question: "Кто создал LapLapLa?",
        answer:
          "LapLapLa создана и развивается Julia Noah Makhlin как независимый авторский проект.",
      },
    ],
  },
  en: {
    tagline: "Science and creativity through stories, maps, music, drawing, and animation.",
    summary:
      "LapLapLa is an interactive creative and popular-science platform by Julia Noah Makhlin for users aged 16 and over. Its characters help people explore science, books, art, music, and geography through visual stories, interactive tools, and creative experiments.",
    audience:
      "The project is for users aged 16 and over who enjoy clear explanations, visual stories, and interactive creative formats.",
    author:
      "LapLapLa is created and developed by Julia Noah Makhlin, who leads the concept, interface development, content, and learning system behind the project.",
    format:
      "LapLapLa's main formats are cats explaining complex questions, dogs guiding drawing lessons, capybaras retelling books, parrots introducing music, and raccoons exploring the world through interactive maps.",
    topics: [
      "popular science",
      "interactive learning",
      "simple explanations of complex topics",
      "books and visual stories",
      "drawing and creative tools",
      "music games",
      "geography and maps",
      "AI-assisted learning",
    ],
    pages: [
      {
        name: "Cats Explain",
        path: "/cats",
        description: "Short visual explanations of complex questions.",
      },
      {
        name: "Dogs Draw",
        path: "/dog",
        description: "Step-by-step drawing lessons, coloring, and creative modes.",
      },
      {
        name: "Capybaras Tell Stories",
        path: "/capybara",
        description: "Book retellings, story slides, and quizzes.",
      },
      {
        name: "Parrots Sing",
        path: "/parrots",
        description: "Music stories, rhythms, and interactive mixes.",
      },
      {
        name: "Raccoons Explore",
        path: "/raccoons",
        description: "Interactive maps, country facts, animal facts, rivers, seas, and quests.",
      },
    ],
    faq: [
      {
        question: "What is LapLapLa?",
        answer:
          "LapLapLa is an author-led interactive creative and popular-science platform by Julia Noah Makhlin for users aged 16 and over.",
      },
      {
        question: "Who is LapLapLa for?",
        answer:
          "LapLapLa is for people aged 16 and over who are curious about science, books, art, music, geography, and creative experiments.",
      },
      {
        question: "Who created LapLapLa?",
        answer:
          "LapLapLa was created and is developed by Julia Noah Makhlin as an independent author-led project.",
      },
    ],
  },
  he: {
    tagline: "מדע ויצירה דרך סיפורים, מפות, מוזיקה, ציור ואנימציה.",
    summary:
      "LapLapLa היא פלטפורמה אינטראקטיבית ליצירה ולמדע פופולרי מאת Julia Noah Makhlin, המיועדת לבני 16 ומעלה. הדמויות שלה מזמינות לחקור מדע, ספרים, אמנות, מוזיקה וגאוגרפיה באמצעות סיפורים חזותיים, כלים אינטראקטיביים וניסויים יצירתיים.",
    audience:
      "הפרויקט מיועד לבני 16 ומעלה שאוהבים הסברים ברורים, סיפורים חזותיים ופורמטים יצירתיים אינטראקטיביים.",
    author:
      "LapLapLa נוצרה ומפותחת על ידי Julia Noah Makhlin, שמובילה את הקונספט, פיתוח הממשקים, התוכן ומערכת הלמידה של הפרויקט.",
    format:
      "הפורמטים המרכזיים של LapLapLa הם חתולים שמסבירים שאלות מורכבות, כלבים שמובילים שיעורי ציור, קפיברות שמספרות ספרים, תוכונים שמציגים מוזיקה ודביבונים שחוקרים את העולם דרך מפות אינטראקטיביות.",
    topics: [
      "מדע פופולרי",
      "למידה אינטראקטיבית",
      "הסברים פשוטים לנושאים מורכבים",
      "ספרים וסיפורים חזותיים",
      "ציור וכלי יצירה",
      "משחקי מוזיקה",
      "גאוגרפיה ומפות",
      "AI-assisted learning",
    ],
    pages: [
      {
        name: "חתולים מסבירים",
        path: "/cats",
        description: "הסברים חזותיים קצרים לשאלות מורכבות.",
      },
      {
        name: "כלבלבים מציירים",
        path: "/dog",
        description: "שיעורי ציור שלב אחר שלב, צביעה ומצבי יצירה.",
      },
      {
        name: "קפיברות יספרו",
        path: "/capybara",
        description: "סיפורי ספרים, שקופיות ומבחנים.",
      },
      {
        name: "תוכונים שרים",
        path: "/parrots",
        description: "סיפורי מוזיקה, מקצבים ומיקסים אינטראקטיביים.",
      },
      {
        name: "דביבונים חוקרים",
        path: "/raccoons",
        description: "מפות אינטראקטיביות, עובדות על מדינות, בעלי חיים, נהרות, ימים ומשימות.",
      },
    ],
    faq: [
      {
        question: "מה זה LapLapLa?",
        answer:
          "LapLapLa היא פלטפורמה אינטראקטיבית ליצירה ולמדע פופולרי מאת Julia Noah Makhlin, המיועדת לבני 16 ומעלה.",
      },
      {
        question: "למי LapLapLa מיועדת?",
        answer:
          "LapLapLa מיועדת לבני 16 ומעלה שמתעניינים במדע, בספרים, באמנות, במוזיקה, בגאוגרפיה ובניסויים יצירתיים.",
      },
      {
        question: "מי יצרה את LapLapLa?",
        answer:
          "LapLapLa נוצרה ומפותחת על ידי Julia Noah Makhlin כפרויקט עצמאי בהובלת היוצרת.",
      },
    ],
  },
};

export function buildHomeGeoJsonLd(lang: Lang) {
  const profile = GEO_PROFILES[lang];
  const homePath = buildLocalizedPublicPath("/", lang);
  const homeUrl = `${BASE_URL}${homePath === "/" ? "" : homePath}`;
  const pageItems = profile.pages.map((page, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: page.name,
    url: `${BASE_URL}${buildLocalizedPublicPath(page.path, lang)}`,
    description: page.description,
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${homeUrl}#homepage`,
      url: homeUrl,
      name: `${SITE_NAME} — ${profile.tagline}`,
      description: profile.summary,
      inLanguage: lang,
      isPartOf: {
        "@id": ENTITY_IDS.website,
      },
      publisher: {
        "@id": ENTITY_IDS.organization,
      },
      about: [
        {
          "@id": ENTITY_IDS.organization,
        },
        ...profile.topics.map((topic) => ({
          "@type": "Thing",
          name: topic,
        })),
      ],
      audience: {
        "@type": "Audience",
        audienceType: profile.audience,
      },
      author: {
        "@id": ENTITY_IDS.author,
        name: AUTHOR_NAME,
      },
      creator: {
        "@id": ENTITY_IDS.author,
        name: AUTHOR_NAME,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: `${BASE_URL}/laplapla-logo-letters.webp`,
      },
      mainEntity: {
        "@type": "ItemList",
        name: `${SITE_NAME} core learning sections`,
        itemListElement: pageItems,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${homeUrl}#faq`,
      inLanguage: lang,
      mainEntity: profile.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];
}
