import {
  buildAnimalSlideMediaQueries,
  findAlternativeSlideMedia,
} from "@/lib/client/slideMediaSearch";
import type { StudioSlide } from "@/types/studio";

export type Artwork = {
  id: string;
  title: string;
  description: string;
  image_url: string[];
};

const YORKIE_HINTS = ["yorkshire terrier", "yorkie"];
const GENERIC_DOG_HINTS = ["dog", "puppy", "pet dog"];

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitIntoSentences(value: string) {
  return stripHtml(value)
    .split(/(?<=[.!?…。！？])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildArtGalleryQueries(
  artworkTitle: string,
  sentence: string,
  preferYorkie: boolean,
  fallbackHints: string[] = [],
) {
  const shortSentence = stripHtml(sentence)
    .split(/\s+/)
    .slice(0, 6)
    .join(" ");

  if (preferYorkie) {
    return [
      "yorkshire terrier dog portrait",
      "yorkie dog portrait",
      "yorkshire terrier puppy",
      `yorkshire terrier ${shortSentence}`.trim(),
      `yorkie ${shortSentence}`.trim(),
      `yorkshire terrier ${stripHtml(artworkTitle)}`.trim(),
    ].filter(Boolean);
  }

  return [
    "cute dog portrait",
    "puppy dog portrait",
    "pet dog portrait",
    `dog ${shortSentence}`.trim(),
    `puppy ${shortSentence}`.trim(),
    `dog ${stripHtml(artworkTitle)}`.trim(),
    ...buildAnimalSlideMediaQueries(
      fallbackHints.length > 0 ? fallbackHints : GENERIC_DOG_HINTS,
      artworkTitle,
      sentence,
    ),
  ].filter(Boolean);
}

export async function buildArtworkSlides(
  artwork: Artwork,
  fallbackHints: string[],
) {
  const sentences = splitIntoSentences(artwork.description);
  const imageQueue = artwork.image_url.filter(Boolean);
  const usedUrls = new Set(imageQueue);
  const slides: StudioSlide[] = [];

  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index];
    let mediaUrl = imageQueue[index];

    if (!mediaUrl) {
      const shouldPreferYorkie = index % 2 === 0;
      const alternative = await findAlternativeSlideMedia({
        queries: buildArtGalleryQueries(
          artwork.title,
          sentence,
          shouldPreferYorkie,
          fallbackHints,
        ),
        excludedUrls: Array.from(usedUrls),
        preferredSources: ["pexels"],
        allowedMediaTypes: ["image"],
      });

      mediaUrl =
        alternative?.url ||
        imageQueue[imageQueue.length - 1] ||
        "/dog/fibi.webp";
    }

    if (mediaUrl) {
      usedUrls.add(mediaUrl);
    }

    slides.push({
      id: `${artwork.id}-${index}`,
      text: escapeHtml(sentence),
      mediaUrl,
      mediaType: mediaUrl?.endsWith(".mp4") ? "video" : "image",
      mediaFit: "contain",
      bgColor: "#ffffff",
      textColor: "#111111",
    });
  }

  return slides;
}

export async function findArtworkSlideAlternativeMedia(params: {
  fallbackHints: string[];
  artworkTitle: string;
  slideText: string;
  excludedUrls: string[];
  preferYorkie?: boolean;
}) {
  const slideHints = params.preferYorkie
    ? YORKIE_HINTS
    : params.fallbackHints.length > 0
      ? params.fallbackHints
      : GENERIC_DOG_HINTS;

  return findAlternativeSlideMedia({
    queries: params.preferYorkie
      ? buildArtGalleryQueries(
          params.artworkTitle,
          params.slideText,
          true,
          params.fallbackHints,
        )
      : [
          ...buildArtGalleryQueries(
            params.artworkTitle,
            params.slideText,
            false,
            params.fallbackHints,
          ),
          ...buildAnimalSlideMediaQueries(
            slideHints,
            params.artworkTitle,
            stripHtml(params.slideText),
          ),
        ],
    excludedUrls: params.excludedUrls,
    preferredSources: ["pexels"],
    allowedMediaTypes: ["image"],
  });
}
