import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { buildCanonicalMapEntityPath, type CanonicalMapEntityType } from "@/lib/mapEntityRouting";
import type { MapPopupContent } from "@/types/mapPopup";

export type SeoEntityType = CanonicalMapEntityType;

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
  slug: string;
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
    ru: "Биомы и рельеф",
    en: "Biomes and Landscape",
    he: "ביומות ותוואי שטח",
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

const BACK_TO_MAPS_LABEL: Record<Lang, string> = {
  ru: "Назад к картам",
  en: "Back to maps",
  he: "חזרה למפות",
};

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
  slug,
  title,
  groupedStories,
  lang,
}: Props) {
  const router = useRouter();
  const currentLang = lang ?? getCurrentLang(router);
  const dict = dictionaries[currentLang] || dictionaries.ru;
  const mapSeo = dict.seo.raccoons.map;
  const titleSuffixByType: Record<SeoEntityType, string> = {
    country: mapSeo.countryTitleSuffix,
    animal: mapSeo.animalTitleSuffix,
    river: mapSeo.riverTitleSuffix,
    sea: mapSeo.seaTitleSuffix,
    biome: mapSeo.biomeTitleSuffix,
  };
  const dir = currentLang === "he" ? "rtl" : "ltr";
  const seoTitle = `${title} — ${titleSuffixByType[entityType]}`;
  const seoDescription = `${title} — ${mapSeo.descriptionSuffix}`;
  const seoPath = buildCanonicalMapEntityPath(entityType, slug);

  return (
    <>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} type="article" />
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

        <div style={{ marginTop: "40px" }}>
          <Link
            href={{ pathname: "/raccoons", query: buildLocalizedQuery(currentLang) }}
            locale={currentLang}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 18px",
              borderRadius: "999px",
              backgroundColor: "#111827",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {BACK_TO_MAPS_LABEL[currentLang]}
          </Link>
          <p style={{ marginTop: "16px", color: "#555" }}>{dict.home.title}</p>
        </div>
      </main>
    </>
  );
}
