import { findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";
import { buildShortSlideMediaQuery, extractSlideConcepts, mapWithConcurrency } from "@/lib/media/slideMedia";

export type ParrotStorySlide = {
  text: string;
  mediaUrl?: string;
  mediaType?: "gif" | "image" | "video";
  mediaId?: string;
};

const PLACEHOLDER_MEDIA = {
  id: "local:parrot-placeholder",
  url: "/images/parrot.webp",
  mediaType: "image" as const,
};

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

const getSpecialParrotQuery = (index: number, slideCount: number) => {
  const middleIndex = Math.floor(slideCount / 2);
  if (index === 0 || index === slideCount - 1) return "parrot dancing";
  if (index === middleIndex) return "funny parrot";
  return null;
};

const buildMediaQueries = (styleSlug: string, slideText: string, slideIndex = 0) => {
  const style = styleSlug.trim().toLowerCase();
  const styleHints = STYLE_HINTS[style] ?? extractSlideConcepts(slideText, [style]);
  const primaryHint = styleHints[slideIndex % styleHints.length] || style || "music";
  const secondaryHint = styleHints[(slideIndex + 1) % styleHints.length] || "music";
  return [
    buildShortSlideMediaQuery("parrot", "", [primaryHint]),
    buildShortSlideMediaQuery("parrot", "", [secondaryHint]),
    "parrot",
  ].filter(Boolean);
};

export const buildParrotMediaQueries = (styleSlug: string, slideText: string, slideIndex = 0) =>
  buildMediaQueries(styleSlug, slideText, slideIndex);

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
  const usedMediaIds = new Set<string>(slides.map((slide) => slide.mediaId).filter(Boolean) as string[]);
  return mapWithConcurrency(slides, 4, async (slide, index) => {

    if (slide.mediaUrl) {
      return {
        ...slide,
        mediaType: slide.mediaType ?? getMediaTypeFromUrl(slide.mediaUrl),
      };
    }

    const specialParrotQuery = getSpecialParrotQuery(index, slides.length);
    const queries = [
      ...buildMediaQueries(styleSlug, slide.text, index),
      ...(specialParrotQuery ? [specialParrotQuery] : []),
    ];
    const media = await findAlternativeSlideMedia({
      queries,
      excludedUrls: Array.from(usedMedia),
      excludedIds: Array.from(usedMediaIds),
      preferredSources: specialParrotQuery ? ["giphy", "pexels", "laplapla"] : index % 2 === 0 ? ["giphy", "pexels", "laplapla"] : ["pexels", "giphy", "laplapla"],
      selectionSeed: `${styleSlug}:${index}:${slide.text}`,
    });

    const selected = media ?? PLACEHOLDER_MEDIA;
    usedMedia.add(selected.url);
    usedMediaIds.add(selected.id);
    return {
      ...slide,
      mediaUrl: selected.url,
      mediaType: slide.mediaType ?? selected.mediaType,
      mediaId: selected.id,
    };
  });
}

export async function findAlternativeParrotStoryMedia(
  styleSlug: string,
  slide: ParrotStorySlide,
  slideIndex: number,
  slideCount: number,
  excludedUrls: string[] = [],
) {
  const specialParrotQuery = getSpecialParrotQuery(slideIndex, slideCount);
  const queries = [
    ...buildMediaQueries(styleSlug, slide.text, slideIndex),
    ...(specialParrotQuery ? [specialParrotQuery] : []),
  ];

  return findAlternativeSlideMedia({
    queries,
    excludedUrls,
    preferredSources: specialParrotQuery ? ["giphy", "pexels", "laplapla"] : slideIndex % 2 === 0 ? ["giphy", "pexels", "laplapla"] : ["pexels", "giphy", "laplapla"],
    selectionSeed: `${styleSlug}:${slideIndex}:${slide.text}`,
  });
}
