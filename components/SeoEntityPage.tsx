import Head from "next/head";
import { useRouter } from "next/router";
import { dictionaries, type Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import type { MapPopupContent } from "@/types/mapPopup";

export type SeoEntityType = "country" | "animal" | "river" | "sea";

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

const DEFAULT_SITE_URL = "https://laplapla.com";

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
      title: (name) => `${name}: страна, культура и факты для детей | LapLapLa`,
      description: (name) => `Узнай о ${name}: культура, природа, еда и интересные факты для детей на LapLapLa.`,
    },
    en: {
      title: (name) => `${name}: country, culture, and facts for kids | LapLapLa`,
      description: (name) => `Discover ${name}: culture, nature, food, and fun facts for kids on LapLapLa.`,
    },
    he: {
      title: (name) => `${name}: מדינה, תרבות ועובדות לילדים | LapLapLa`,
      description: (name) => `גלו על ${name}: תרבות, טבע, אוכל ועובדות מעניינות לילדים ב-LapLapLa.`,
    },
  },
  river: {
    ru: {
      title: (name) => `${name}: река и природные факты для детей | LapLapLa`,
      description: (name) => `Узнай о реке ${name}: природа, климат и интересные факты для детей на LapLapLa.`,
    },
    en: {
      title: (name) => `${name}: river facts for kids | LapLapLa`,
      description: (name) => `Discover the ${name} river: nature, climate, and fun facts for kids on LapLapLa.`,
    },
    he: {
      title: (name) => `${name}: עובדות על נהר לילדים | LapLapLa`,
      description: (name) => `גלו על הנהר ${name}: טבע, אקלים ועובדות מעניינות לילדים ב-LapLapLa.`,
    },
  },
  animal: {
    ru: {
      title: (name) => `${name}: животные и климат для детей | LapLapLa`,
      description: (name) => `Узнай о ${name}: животные, климат, природа и интересные факты для детей на LapLapLa.`,
    },
    en: {
      title: (name) => `${name}: animals and climate for kids | LapLapLa`,
      description: (name) => `Discover ${name}: animals, climate, nature, and fun facts for kids on LapLapLa.`,
    },
    he: {
      title: (name) => `${name}: בעלי חיים ואקלים לילדים | LapLapLa`,
      description: (name) => `גלו על ${name}: בעלי חיים, אקלים, טבע ועובדות מעניינות לילדים ב-LapLapLa.`,
    },
  },
  sea: {
    ru: {
      title: (name) => `${name}: море и факты для детей | LapLapLa`,
      description: (name) => `Узнай о ${name}: природа, климат и интересные факты для детей на LapLapLa.`,
    },
    en: {
      title: (name) => `${name}: sea facts for kids | LapLapLa`,
      description: (name) => `Discover ${name}: nature, climate, and fun facts for kids on LapLapLa.`,
    },
    he: {
      title: (name) => `${name}: עובדות על ים לילדים | LapLapLa`,
      description: (name) => `גלו על ${name}: טבע, אקלים ועובדות מעניינות לילדים ב-LapLapLa.`,
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

type StoryBlock =
  | { type: "paragraph"; id: string; text: string }
  | { type: "image"; id: string; url: string; alt: string; creditLine: string | null };

function mergeSentencesIntoParagraphs(lines: string[], chunkSize = 4) {
  const normalizedLines = lines
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];

  for (let index = 0; index < normalizedLines.length; index += chunkSize) {
    const chunk = normalizedLines.slice(index, index + chunkSize);
    if (chunk.length > 0) {
      paragraphs.push(chunk.join(" "));
    }
  }

  return paragraphs;
}

function getStoryBlocks(story: MapPopupContent, title: string): StoryBlock[] {
  if (story.slides.length > 0) {
    const paragraphs: StoryBlock[] = [];
    const images: StoryBlock[] = [];
    const textLines = story.slides
      .map((slide) => slide.text.trim())
      .filter(Boolean);
    const mergedParagraphs = mergeSentencesIntoParagraphs(textLines);
    const paragraphIds = story.slides.map((slide) => slide.id);

    mergedParagraphs.forEach((text, index) => {
      paragraphs.push({
        type: "paragraph",
        id: `paragraph:${paragraphIds[index] ?? `${story.storyId ?? story.targetId}:${index}`}`,
        text,
      });
    });

    story.slides.forEach((slide, index) => {
      const imageUrl = typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";

      if (imageUrl && images.length < 3) {
        images.push({
          type: "image",
          id: `image:${slide.id}`,
          url: imageUrl,
          alt: `${title} illustration ${index + 1}`,
          creditLine: slide.imageCreditLine ?? null,
        });
      }
    });

    const blocks: StoryBlock[] = [];
    const imageInsertAfterParagraph = images.length > 0
      ? Math.max(1, Math.ceil(paragraphs.length / (images.length + 1)))
      : Number.POSITIVE_INFINITY;
    let insertedImages = 0;

    paragraphs.forEach((paragraph, index) => {
      blocks.push(paragraph);

      const paragraphPosition = index + 1;
      const shouldInsertImage =
        insertedImages < images.length &&
        paragraphPosition >= imageInsertAfterParagraph * (insertedImages + 1);

      if (shouldInsertImage) {
        const image = images[insertedImages];
        if (image) {
          blocks.push(image);
          insertedImages += 1;
        }
      }
    });

    images.slice(insertedImages).forEach((image) => {
      blocks.push(image);
    });

    return blocks;
  }

  const paragraphs = mergeSentencesIntoParagraphs(
    String(story.rawContent || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean),
  );

  return paragraphs.map((text, index) => ({
    type: "paragraph" as const,
    id: `paragraph:${story.storyId ?? story.targetId}:${index}`,
    text,
  }));
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
  const siteUrl = (process.env["NEXT_PUBLIC_SITE_URL"] || DEFAULT_SITE_URL).replace(/\/+$/, "") || DEFAULT_SITE_URL;
  const canonicalUrl = `${siteUrl}${router.asPath ? router.asPath.split("#")[0] : ""}`;
  const seoTitle = pageSeo.title(title);
  const seoDescription = pageSeo.description(title);

  return (
    <>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
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
              {stories.map((story) => {
                const storyBlocks = getStoryBlocks(story, title);

                return (
                  <article
                    key={`${sectionKey}:${story.storyId ?? story.targetId}`}
                    style={{ marginBottom: "24px", overflow: "hidden" }}
                  >
                    {storyBlocks.map((block, index) => {
                    if (block.type === "image") {
                      const imageIndex = storyBlocks
                        .slice(0, index + 1)
                        .filter((item) => item.type === "image").length - 1;
                      const floatSide = imageIndex % 2 === 0 ? "right" : "left";
                      const imageMargins = floatSide === "right"
                        ? "4px 0 12px 18px"
                        : "4px 18px 12px 0";

                      return (
                        <figure
                          key={block.id}
                          style={{
                            float: floatSide,
                            width: "min(220px, 42%)",
                            margin: imageMargins,
                          }}
                        >
                          <img
                            src={block.url}
                            alt={block.alt}
                            style={{
                              display: "block",
                              width: "100%",
                              height: "auto",
                              borderRadius: "14px",
                              objectFit: "cover",
                              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                            }}
                          />
                          {block.creditLine ? (
                            <figcaption
                              style={{
                                marginTop: "6px",
                                fontSize: "12px",
                                lineHeight: 1.4,
                                color: "#666",
                              }}
                            >
                              {block.creditLine}
                            </figcaption>
                          ) : null}
                        </figure>
                      );
                    }

                    return (
                      <p key={block.id} style={{ margin: "0 0 12px" }}>
                        {block.text}
                      </p>
                    );
                    })}
                  </article>
                );
              })}
            </section>
          );
        })}

        <p style={{ marginTop: "32px", color: "#555" }}>{dict.home.title}</p>
      </main>
    </>
  );
}
