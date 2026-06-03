import { findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";
import type { StudioSlide } from "@/types/studio";
import { buildShortSlideMediaQuery, mapWithConcurrency } from "@/lib/media/slideMedia";

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
  const prefix = preferYorkie ? "yorkshire terrier" : "dog";
  const shortQuery = buildShortSlideMediaQuery(prefix, stripHtml(sentence));

  if (preferYorkie) {
    return [
      shortQuery,
      buildShortSlideMediaQuery("yorkshire terrier", stripHtml(artworkTitle)),
      "yorkshire terrier dog portrait",
    ].filter(Boolean);
  }

  return [
    "cute dog portrait",
    "puppy dog portrait",
    "pet dog portrait",
    shortQuery,
    buildShortSlideMediaQuery("dog", stripHtml(artworkTitle), fallbackHints),
  ].filter(Boolean);
}

export async function buildArtworkSlides(
  artwork: Artwork,
  fallbackHints: string[],
) {
  const sentences = splitIntoSentences(artwork.description);
  const imageQueue = artwork.image_url.filter(Boolean);
  const usedUrls = new Set(imageQueue);
  const usedMediaIds = new Set<string>();
  return mapWithConcurrency<string, StudioSlide>(sentences, 4, async (sentence, index) => {
    let mediaUrl = imageQueue[index];

    if (!mediaUrl) {
      const alternative = await findAlternativeSlideMedia({
        queries: buildArtGalleryQueries(
          artwork.title,
          sentence,
          true,
          fallbackHints,
        ),
        excludedUrls: Array.from(usedUrls),
        excludedIds: Array.from(usedMediaIds),
        preferredSources: ["pexels", "laplapla"],
        allowedMediaTypes: ["image"],
        selectionSeed: `${artwork.id}:${index}:${sentence}`,
      });

      mediaUrl =
        alternative?.url ||
        imageQueue[imageQueue.length - 1] ||
        "/dog/fibi.webp";
      if (alternative) {
        usedMediaIds.add(alternative.id);
      }
    }

    if (mediaUrl) {
      usedUrls.add(mediaUrl);
    }

    return {
      id: `${artwork.id}-${index}`,
      text: escapeHtml(sentence),
      mediaUrl,
      mediaType: mediaUrl?.endsWith(".mp4") ? "video" : "image",
      mediaFit: "contain",
      bgColor: "#ffffff",
      textColor: "#111111",
    };
  });
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
          buildShortSlideMediaQuery(slideHints[0] || "dog", stripHtml(params.slideText)),
        ],
    excludedUrls: params.excludedUrls,
    preferredSources: ["pexels", "laplapla"],
    allowedMediaTypes: ["image"],
    selectionSeed: `${params.artworkTitle}:${params.slideText}`,
  });
}
