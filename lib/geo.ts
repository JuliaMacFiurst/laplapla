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
    tagline: "Обучение через игры, истории, карты, музыку, рисование и анимацию.",
    summary:
      "LapLapLa — независимый авторский образовательный проект Julia Noah Makhlin для детей и взрослых. Сайт превращает сложные темы в короткие интерактивные форматы: объясняющие слайды, творческие студии, книжные пересказы, музыкальные эксперименты, карты и квесты.",
    audience:
      "Проект рассчитан на детей, родителей, учителей и взрослых, которым нравятся понятные объяснения, визуальное обучение и игровые образовательные сценарии.",
    author:
      "LapLapLa создана и развивается Julia Noah Makhlin, которая отвечает за концепцию, разработку интерфейсов, контент и образовательную систему проекта.",
    format:
      "Главные форматы LapLapLa: котики объясняют сложные вопросы, пёсики ведут уроки рисования, капибары пересказывают книги, попугайчики знакомят с музыкой, енотики исследуют мир на интерактивных картах.",
    topics: [
      "детское образование",
      "интерактивное обучение",
      "объяснения сложных тем простым языком",
      "книги и истории для детей",
      "рисование для детей",
      "музыкальные игры",
      "география и карты",
      "AI-assisted learning",
    ],
    pages: [
      {
        name: "Котики объяснят",
        path: "/cats",
        description: "Короткие визуальные объяснения сложных вопросов для детей.",
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
        description: "Музыкальные истории, ритмы и миксы для детей.",
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
          "LapLapLa — авторская образовательная платформа Julia Noah Makhlin, где дети учатся через истории, игры, карты, музыку, рисование и анимацию.",
      },
      {
        question: "Для кого создан LapLapLa?",
        answer:
          "LapLapLa создан для детей, родителей, учителей и взрослых, которым нужны простые визуальные объяснения и интерактивные образовательные форматы.",
      },
      {
        question: "Кто создал LapLapLa?",
        answer:
          "LapLapLa создана и развивается Julia Noah Makhlin как независимый авторский проект.",
      },
    ],
  },
  en: {
    tagline: "Learning through games, stories, maps, music, drawing, and animation.",
    summary:
      "LapLapLa is an independent author-led learning project by Julia Noah Makhlin for children and grown-ups. The site turns complex topics into short interactive formats: explanatory slides, creative studios, book retellings, music experiments, maps, and quests.",
    audience:
      "The project is for children, parents, teachers, and grown-ups who enjoy clear explanations, visual learning, and playful educational scenarios.",
    author:
      "LapLapLa is created and developed by Julia Noah Makhlin, who leads the concept, interface development, content, and learning system behind the project.",
    format:
      "LapLapLa's main formats are cats explaining complex questions, dogs guiding drawing lessons, capybaras retelling books, parrots introducing music, and raccoons exploring the world through interactive maps.",
    topics: [
      "children's education",
      "interactive learning",
      "simple explanations of complex topics",
      "books and stories for children",
      "drawing for kids",
      "music games",
      "geography and maps",
      "AI-assisted learning",
    ],
    pages: [
      {
        name: "Cats Explain",
        path: "/cats",
        description: "Short visual explanations of complex questions for kids.",
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
        description: "Music stories, rhythms, and playful mixes for children.",
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
          "LapLapLa is an author-led learning platform by Julia Noah Makhlin where children learn through stories, games, maps, music, drawing, and animation.",
      },
      {
        question: "Who is LapLapLa for?",
        answer:
          "LapLapLa is for children, parents, teachers, and grown-ups who want simple visual explanations and interactive learning formats.",
      },
      {
        question: "Who created LapLapLa?",
        answer:
          "LapLapLa was created and is developed by Julia Noah Makhlin as an independent author-led project.",
      },
    ],
  },
  he: {
    tagline: "למידה דרך משחקים, סיפורים, מפות, מוזיקה, ציור ואנימציה.",
    summary:
      "LapLapLa היא פלטפורמת למידה עצמאית של Julia Noah Makhlin לילדים ולמבוגרים. האתר הופך נושאים מורכבים לפורמטים אינטראקטיביים קצרים: שקופיות הסבר, אולפני יצירה, סיפורי ספרים, ניסויי מוזיקה, מפות ומשימות.",
    audience:
      "הפרויקט מיועד לילדים, הורים, מורים ומבוגרים שאוהבים הסברים ברורים, למידה חזותית ותרחישי לימוד משחקיים.",
    author:
      "LapLapLa נוצרה ומפותחת על ידי Julia Noah Makhlin, שמובילה את הקונספט, פיתוח הממשקים, התוכן ומערכת הלמידה של הפרויקט.",
    format:
      "הפורמטים המרכזיים של LapLapLa הם חתולים שמסבירים שאלות מורכבות, כלבים שמובילים שיעורי ציור, קפיברות שמספרות ספרים, תוכונים שמציגים מוזיקה ודביבונים שחוקרים את העולם דרך מפות אינטראקטיביות.",
    topics: [
      "חינוך ילדים",
      "למידה אינטראקטיבית",
      "הסברים פשוטים לנושאים מורכבים",
      "ספרים וסיפורים לילדים",
      "ציור לילדים",
      "משחקי מוזיקה",
      "גאוגרפיה ומפות",
      "AI-assisted learning",
    ],
    pages: [
      {
        name: "חתולים מסבירים",
        path: "/cats",
        description: "הסברים חזותיים קצרים לשאלות מורכבות לילדים.",
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
        description: "סיפורי מוזיקה, מקצבים ומיקסים משחקיים לילדים.",
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
          "LapLapLa היא פלטפורמת למידה של Julia Noah Makhlin שבה ילדים לומדים דרך סיפורים, משחקים, מפות, מוזיקה, ציור ואנימציה.",
      },
      {
        question: "למי LapLapLa מיועדת?",
        answer:
          "LapLapLa מיועדת לילדים, הורים, מורים ומבוגרים שרוצים הסברים חזותיים פשוטים ופורמטים אינטראקטיביים ללמידה.",
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
