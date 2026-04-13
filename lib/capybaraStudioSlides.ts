import type { Slide } from "@/types/types";

type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

export type ImportedStudioSlide = {
  text: string;
  image?: string;
  mediaType?: "image" | "video";
  mediaFit: "contain";
  mediaPosition: "center";
  textPosition: "bottom" | "center";
  textAlign: "center";
  textBgEnabled?: boolean;
  textBgColor?: string;
  textBgOpacity?: number;
  introLayout?: "book-meta";
};

export type StudioBookIntro = {
  title: string;
  author?: string | null;
  year?: string | number | null;
  ageGroup?: string | number | null;
};

function resolveSlideMediaUrl(
  slide: Slide,
  resolvedMedia?: SlideMedia,
): { mediaUrl?: string; mediaType?: "image" | "video" } {
  if (resolvedMedia?.type === "video" && resolvedMedia.videoUrl) {
    return { mediaUrl: resolvedMedia.videoUrl, mediaType: "video" };
  }

  if (resolvedMedia?.type === "gif" && resolvedMedia.gifUrl) {
    return { mediaUrl: resolvedMedia.gifUrl, mediaType: "image" };
  }

  if (resolvedMedia?.type === "image") {
    const imageUrl =
      resolvedMedia.capybaraImage || resolvedMedia.imageUrl;
    if (imageUrl) {
      return { mediaUrl: imageUrl, mediaType: "image" };
    }
  }

  if (slide.videoUrl) {
    return { mediaUrl: slide.videoUrl, mediaType: "video" };
  }

  const fallbackImage = slide.capybaraImage || slide.imageUrl || slide.gifUrl;
  if (fallbackImage) {
    return { mediaUrl: fallbackImage, mediaType: "image" };
  }

  return {};
}

export function buildStudioSlidesFromCapybaraSlides(
  slides: Slide[],
  mediaCache?: ReadonlyMap<number, SlideMedia>,
  intro?: StudioBookIntro,
): ImportedStudioSlide[] {
  const introParts = intro
    ? [
        intro.title?.trim(),
        intro.author ? String(intro.author).trim() : "",
        intro.year !== null && intro.year !== undefined
          ? String(intro.year).trim()
          : "",
        intro.ageGroup !== null && intro.ageGroup !== undefined
          ? String(intro.ageGroup).trim()
          : "",
      ].filter(Boolean)
    : [];

  const introSlide: ImportedStudioSlide[] = introParts.length
    ? [{
        text: introParts.join("\n"),
        mediaFit: "contain" as const,
        mediaPosition: "center" as const,
        textPosition: "center" as const,
        textAlign: "center" as const,
        textBgEnabled: false,
        introLayout: "book-meta",
      }]
    : [];

  const storySlides: ImportedStudioSlide[] = slides.map((slide, index) => {
    const { mediaUrl, mediaType } = resolveSlideMediaUrl(
      slide,
      mediaCache?.get(index),
    );

    return {
      text: slide.text,
      image: mediaUrl,
      mediaType,
      mediaFit: "contain",
      mediaPosition: "center",
      textPosition: "bottom",
      textAlign: "center",
      textBgEnabled: true,
      textBgColor: "#ffffff",
      textBgOpacity: 1,
    };
  });

  return [...introSlide, ...storySlides];
}
