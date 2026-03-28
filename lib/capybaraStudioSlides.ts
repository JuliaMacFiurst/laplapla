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
  textPosition: "bottom";
  textAlign: "center";
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
): ImportedStudioSlide[] {
  return slides.map((slide, index) => {
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
    };
  });
}
