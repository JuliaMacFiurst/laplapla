import Head from "next/head";
import { useRouter } from "next/router";
import { dictionaries, type Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import type { MapPopupContent } from "@/types/mapPopup";

export type SeoEntityType = "country" | "river" | "forest";

export type GroupedStories = {
  country: MapPopupContent[];
  culture: MapPopupContent[];
  food: MapPopupContent[];
  animal: MapPopupContent[];
  weather: MapPopupContent[];
  river: MapPopupContent[];
  sea: MapPopupContent[];
  physic: MapPopupContent[];
};

type Props = {
  entityType: SeoEntityType;
  title: string;
  groupedStories: GroupedStories;
  lang?: Lang;
};

const SECTION_LABELS: Record<keyof GroupedStories, Record<Lang, string>> = {
  country: {
    ru: "О стране",
    en: "About the Country",
    he: "על המדינה",
  },
  culture: {
    ru: "Культура",
    en: "Culture",
    he: "תרבות",
  },
  food: {
    ru: "Национальные блюда",
    en: "National Dishes",
    he: "מאכלים לאומיים",
  },
  animal: {
    ru: "Животные",
    en: "Animals",
    he: "בעלי חיים",
  },
  weather: {
    ru: "Климат",
    en: "Climate",
    he: "אקלים",
  },
  river: {
    ru: "Реки",
    en: "Rivers",
    he: "נהרות",
  },
  sea: {
    ru: "Моря и океаны",
    en: "Seas and Oceans",
    he: "ימים ואוקיינוסים",
  },
  physic: {
    ru: "Природа и рельеф",
    en: "Nature and Landscape",
    he: "טבע ותוואי שטח",
  },
};

const PAGE_SEO: Record<SeoEntityType, Record<Lang, {
  title: (name: string) => string;
  description: (name: string) => string;
}>> = {
  country: {
    ru: {
      title: (name) => `${name} — страна, культура, реки и природа | LapLapLa`,
      description: (name) => `Узнай о ${name}: культура, природа, животные и интересные факты для детей.`,
    },
    en: {
      title: (name) => `${name} — country, culture, rivers, and nature | LapLapLa`,
      description: (name) => `Discover ${name}: culture, nature, animals, and fun facts for kids.`,
    },
    he: {
      title: (name) => `${name} — מדינה, תרבות, נהרות וטבע | LapLapLa`,
      description: (name) => `גלו על ${name}: תרבות, טבע, בעלי חיים ועובדות מעניינות לילדים.`,
    },
  },
  river: {
    ru: {
      title: (name) => `${name} — река, природа и факты | LapLapLa`,
      description: (name) => `Узнай о ${name}: природа, животные, климат и интересные факты для детей.`,
    },
    en: {
      title: (name) => `${name} — river, nature, and facts | LapLapLa`,
      description: (name) => `Discover ${name}: nature, animals, climate, and fun facts for kids.`,
    },
    he: {
      title: (name) => `${name} — נהר, טבע ועובדות | LapLapLa`,
      description: (name) => `גלו על ${name}: טבע, בעלי חיים, אקלים ועובדות מעניינות לילדים.`,
    },
  },
  forest: {
    ru: {
      title: (name) => `${name} — лес, животные и климат | LapLapLa`,
      description: (name) => `Узнай о ${name}: животные, климат, природа и интересные факты для детей.`,
    },
    en: {
      title: (name) => `${name} — forest, animals, and climate | LapLapLa`,
      description: (name) => `Discover ${name}: animals, climate, nature, and fun facts for kids.`,
    },
    he: {
      title: (name) => `${name} — יער, בעלי חיים ואקלים | LapLapLa`,
      description: (name) => `גלו על ${name}: בעלי חיים, אקלים, טבע ועובדות מעניינות לילדים.`,
    },
  },
};

const SECTION_ORDER: Array<keyof GroupedStories> = [
  "country",
  "culture",
  "food",
  "animal",
  "weather",
  "river",
  "sea",
  "physic",
];

function getStoryParagraphs(story: MapPopupContent) {
  if (story.slides.length > 0) {
    return story.slides
      .map((slide) => slide.text.trim())
      .filter(Boolean);
  }

  return String(story.rawContent || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function SeoEntityPage({
  entityType,
  title,
  groupedStories,
  lang,
}: Props) {
  const router = useRouter();
  const currentLang = lang ?? getCurrentLang(router);
  const dict = dictionaries[currentLang] || dictionaries.ru;
  const pageSeo = PAGE_SEO[entityType][currentLang];
  const dir = currentLang === "he" ? "rtl" : "ltr";

  return (
    <>
      <Head>
        <title>{pageSeo.title(title)}</title>
        <meta name="description" content={pageSeo.description(title)} />
      </Head>
      <main
        dir={dir}
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "48px 20px 64px",
          lineHeight: 1.7,
        }}
      >
        <h1 style={{ marginBottom: "28px" }}>{title}</h1>

        {SECTION_ORDER.map((sectionKey) => {
          const stories = groupedStories[sectionKey];
          if (!stories.length) {
            return null;
          }

          return (
            <section key={sectionKey} style={{ marginBottom: "32px" }}>
              <h2 style={{ marginBottom: "14px" }}>{SECTION_LABELS[sectionKey][currentLang]}</h2>
              {stories.map((story) => (
                <article key={`${sectionKey}:${story.storyId ?? story.targetId}`} style={{ marginBottom: "18px" }}>
                  {getStoryParagraphs(story).map((paragraph, index) => (
                    <p key={`${story.storyId ?? story.targetId}:${index}`} style={{ margin: "0 0 12px" }}>
                      {paragraph}
                    </p>
                  ))}
                </article>
              ))}
            </section>
          );
        })}

        <p style={{ marginTop: "32px", color: "#555" }}>{dict.home.title}</p>
      </main>
    </>
  );
}
