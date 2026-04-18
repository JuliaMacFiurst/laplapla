import { buildAnimalSlideMediaQueries, findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";

export type ParrotStorySlide = {
  text: string;
  mediaUrl?: string;
  mediaType?: "gif" | "image" | "video";
};

const PLACEHOLDER_MEDIA = {
  url: "/images/parrot.webp",
  mediaType: "image" as const,
};

const PARROT_SEARCH_HINTS = ["parrot", "cute parrot", "funny parrot"];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into",
  "это", "как", "что", "для", "или", "его", "она", "они", "про",
  "עם", "של", "זה", "את", "על", "גם", "אבל", "כמו",
  "music", "style", "sound", "song", "genre",
  "музыка", "стиль", "звук", "песня", "жанр",
  "מוזיקה", "סגנון", "צליל", "שיר",
]);

const STYLE_HINTS: Record<string, string[]> = {
  lofi: ["lofi", "chill", "vinyl", "music", "study"],
  bossa: ["bossa", "nova", "brazil", "guitar", "jazz"],
  synthwave: ["synthwave", "retro", "neon", "night", "synth"],
  funk: ["funk", "groove", "bass", "dance", "rhythm"],
  house: ["house", "dance", "club", "beat", "dj"],
  reggae: ["reggae", "dub", "groove", "island", "sunny"],
  ambient: ["ambient", "calm", "space", "dreamy", "soft"],
  jazzhop: ["jazzhop", "jazz", "beats", "lofi", "study"],
  chiptune: ["chiptune", "8bit", "arcade", "pixel", "game"],
  kpop: ["kpop", "dance", "stage", "pop", "show"],
  afroperc: ["afro", "percussion", "drums", "rhythm", "festival"],
  celtic: ["celtic", "folk", "flute", "violin", "legend"],
  latin: ["latin", "fiesta", "dance", "percussion", "summer"],
  cartoon: ["cartoon", "funny", "playful", "comic", "animation"],
  rock: ["rock", "guitar", "drums", "stage", "energy"],
  classic: ["classical", "orchestra", "concert", "piano", "symphony"],
  dance: ["dance", "party", "club", "beat", "energy"],
  spiritual: ["spiritual", "calm", "peace", "meditation", "light"],
};

const extractKeywords = (text: string, styleSlug: string) => {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const styleHints = STYLE_HINTS[styleSlug.trim().toLowerCase()] ?? [styleSlug.trim().toLowerCase()];
  const merged = [...styleHints, ...tokens];
  return merged.filter((word, index) => word && merged.indexOf(word) === index).slice(0, 5);
};

const getSpecialParrotQuery = (index: number, slideCount: number) => {
  const middleIndex = Math.floor(slideCount / 2);
  if (index === 0 || index === slideCount - 1) return "parrot dancing";
  if (index === middleIndex) return "funny parrot";
  return null;
};

const buildMediaQueries = (styleSlug: string, slideText: string) => {
  const keywords = extractKeywords(slideText, styleSlug);
  const style = styleSlug.trim().toLowerCase();
  return buildAnimalSlideMediaQueries(
    PARROT_SEARCH_HINTS,
    [style, ...keywords].filter(Boolean).join(" ").trim(),
    [style, ...keywords.slice(0, 3)].filter(Boolean).join(" ").trim(),
    [...keywords, style, "music"].filter(Boolean).join(" ").trim(),
  );
};

export const buildParrotMediaQueries = (styleSlug: string, slideText: string) =>
  buildMediaQueries(styleSlug, slideText);

const getMediaTypeFromUrl = (url: string) =>
  /\.mp4(\?|$)|\.webm(\?|$)/i.test(url)
    ? "video"
    : /\.gif(\?|$)/i.test(url)
      ? "gif"
      : "image";

export async function resolveParrotStorySlidesWithMedia(
  styleSlug: string,
  slides: ParrotStorySlide[],
): Promise<ParrotStorySlide[]> {
  const usedMedia = new Set<string>(slides.map((slide) => slide.mediaUrl).filter(Boolean) as string[]);
  const resolvedSlides: ParrotStorySlide[] = [];

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];

    if (slide.mediaUrl) {
      resolvedSlides.push({
        ...slide,
        mediaType: slide.mediaType ?? getMediaTypeFromUrl(slide.mediaUrl),
      });
      continue;
    }

    const specialParrotQuery = getSpecialParrotQuery(index, slides.length);
    const queries = specialParrotQuery ? [specialParrotQuery] : buildMediaQueries(styleSlug, slide.text);
    const media = await findAlternativeSlideMedia({
      queries,
      excludedUrls: Array.from(usedMedia),
      preferredSources: specialParrotQuery ? ["giphy", "pexels"] : index % 2 === 0 ? ["giphy", "pexels"] : ["pexels", "giphy"],
    });

    const selected = media ?? PLACEHOLDER_MEDIA;
    usedMedia.add(selected.url);
    resolvedSlides.push({
      ...slide,
      mediaUrl: selected.url,
      mediaType: slide.mediaType ?? selected.mediaType,
    });
  }

  return resolvedSlides;
}

export async function findAlternativeParrotStoryMedia(
  styleSlug: string,
  slide: ParrotStorySlide,
  slideIndex: number,
  slideCount: number,
  excludedUrls: string[] = [],
) {
  const specialParrotQuery = getSpecialParrotQuery(slideIndex, slideCount);
  const queries = specialParrotQuery ? [specialParrotQuery] : buildMediaQueries(styleSlug, slide.text);

  return findAlternativeSlideMedia({
    queries,
    excludedUrls,
    preferredSources: specialParrotQuery ? ["giphy", "pexels"] : slideIndex % 2 === 0 ? ["giphy", "pexels"] : ["pexels", "giphy"],
  });
}
