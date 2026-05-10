import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import { useMobileSlideshow } from "@/components/studio/mobile/useMobileSlideshow";
import {
  buildAnimalSlideMediaQueries,
  findAlternativeSlideMedia,
} from "@/lib/client/slideMediaSearch";
import { getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioHref } from "@/lib/studioRouting";
import { Lang } from "../../i18n";
import type { StudioSlide } from "@/types/studio";

type Artwork = {
  id: string;
  title: string;
  description: string;
  image_url: string[];
};

type MobileArtGalleryProps = {
  categorySlug: string;
  isOpen: boolean;
  onClose: () => void;
};

function stripHtml(value: string) {
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

export default function MobileArtGallery({
  categorySlug,
  isOpen,
  onClose,
}: MobileArtGalleryProps) {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const mobileSlideshow = useMobileSlideshow();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedArtworkIds, setUsedArtworkIds] = useState<string[]>([]);
  const usedArtworkIdsRef = useRef<string[]>([]);
  const [refreshingSlideIndex, setRefreshingSlideIndex] = useState<number | null>(
    null,
  );

  const fallbackHints = useMemo(
    () => ["yorkshire terrier", "yorkie", "dog"],
    [],
  );
  const loadingLabel =
    lang === "he"
      ? "טוען גלריה..."
      : lang === "en"
        ? "Loading gallery..."
        : "Загружаю галерею...";
  const swipeHintLabel =
    lang === "he" ? "החליקו ימינה" : lang === "en" ? "Swipe right" : "Листай вправо";
  const findNewImageLabel =
    lang === "he"
      ? "מצאו תמונה חדשה"
      : lang === "en"
        ? "Find new image"
        : "Найти новую картинку";
  const editInCatsLabel =
    lang === "he"
      ? "פתחו בעורך החתולים"
      : lang === "en"
        ? "Open in Cat Editor"
        : "Открыть в редакторе котиков";
  const closeGalleryLabel =
    lang === "he" ? "סגור גלריה" : lang === "en" ? "Close gallery" : "Закрыть галерею";
  const moreArtistsLabel =
    lang === "he" ? "עוד על אמנים" : lang === "en" ? "More about artists" : "Еще про художников";

  useEffect(() => {
    usedArtworkIdsRef.current = usedArtworkIds;
  }, [usedArtworkIds]);

  const buildSlidesForArtwork = useCallback(async (nextArtwork: Artwork) => {
    const sentences = splitIntoSentences(nextArtwork.description);
    const imageQueue = nextArtwork.image_url.filter(Boolean);
    const usedUrls = new Set(imageQueue);
    const nextSlides: StudioSlide[] = [];

    for (let index = 0; index < sentences.length; index += 1) {
      const sentence = sentences[index];
      let mediaUrl = imageQueue[index];

      if (!mediaUrl) {
        const alternative = await findAlternativeSlideMedia({
          queries: buildAnimalSlideMediaQueries(
            fallbackHints,
            nextArtwork.title,
            sentence,
          ),
          excludedUrls: Array.from(usedUrls),
          preferredSources: ["giphy", "pexels"],
        });

        mediaUrl = alternative?.url || imageQueue[imageQueue.length - 1] || "/dog/fibi.webp";
      }

      if (mediaUrl) {
        usedUrls.add(mediaUrl);
      }

      nextSlides.push({
        id: `${nextArtwork.id}-${index}`,
        text: escapeHtml(sentence),
        mediaUrl,
        mediaType: mediaUrl?.endsWith(".mp4") ? "video" : "image",
        mediaFit: "contain",
        bgColor: "#ffffff",
        textColor: "#111111",
      });
    }

    return nextSlides;
  }, [fallbackHints]);

  const loadArtwork = useCallback(async () => {
    setLoading(true);
    mobileSlideshow.open({ loading: true });

    try {
      const response = await fetch(
        `/api/art-gallery?categorySlug=${encodeURIComponent(categorySlug)}&lang=${lang}&excludeIds=${encodeURIComponent(usedArtworkIdsRef.current.join(","))}`,
      );
      const payload = (await response.json()) as {
        artwork: Artwork | null;
        error?: string;
      };

      if (!response.ok || !payload.artwork) {
        throw new Error(payload.error || "Failed to load gallery");
      }

      setArtwork(payload.artwork);
      setUsedArtworkIds((current) =>
        current.includes(payload.artwork!.id)
          ? current
          : [...current, payload.artwork!.id],
      );
      const slides = await buildSlidesForArtwork(payload.artwork);
      mobileSlideshow.replaceSlides(slides);
    } catch (error) {
      console.error("Failed to load mobile art gallery", error);
      mobileSlideshow.close();
      onClose();
    } finally {
      setLoading(false);
    }
  }, [buildSlidesForArtwork, categorySlug, lang, mobileSlideshow, onClose]);

  useEffect(() => {
    if (!isOpen) {
      mobileSlideshow.close();
      usedArtworkIdsRef.current = [];
      setUsedArtworkIds([]);
      return;
    }

    void loadArtwork();
  }, [isOpen, loadArtwork, mobileSlideshow]);

  const handleFindNewImage = async (slideIndex: number) => {
    const slide = mobileSlideshow.slides[slideIndex];
    if (!slide) return;

    setRefreshingSlideIndex(slideIndex);

    try {
      const alternative = await findAlternativeSlideMedia({
        queries: buildAnimalSlideMediaQueries(
          fallbackHints,
          artwork?.title || "",
          stripHtml(slide.text),
        ),
        excludedUrls: slide.mediaUrl ? [slide.mediaUrl] : [],
        preferredSources: ["giphy", "pexels"],
      });

      if (!alternative?.url) {
        return;
      }

      mobileSlideshow.updateSlides(
        mobileSlideshow.slides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                mediaUrl: alternative.url,
                mediaType: alternative.url.endsWith(".mp4") ? "video" : "image",
              }
            : currentSlide,
        ),
      );
    } finally {
      setRefreshingSlideIndex((current) =>
        current === slideIndex ? null : current,
      );
    }
  };

  const handleEditInCats = () => {
    sessionStorage.setItem(
      "catsSlides",
      JSON.stringify(
        mobileSlideshow.slides.map((slide) => ({
          text: slide.text,
          image: slide.mediaUrl,
          mediaUrl: slide.mediaUrl,
          mediaType: slide.mediaType,
          mediaFit: slide.mediaFit,
          mediaPosition: slide.mediaPosition,
          textPosition: slide.textPosition,
          textAlign: slide.textAlign,
          textBgEnabled: slide.textBgEnabled,
          textBgColor: slide.textBgColor,
          textBgOpacity: slide.textBgOpacity,
        })),
      ),
    );
    void router.push(buildStudioHref("cats", lang), undefined, { locale: lang });
  };

  const handleClose = () => {
    mobileSlideshow.close();
    onClose();
  };

  return (
    <MobileSlideshowViewer
      isOpen={isOpen && mobileSlideshow.isOpen}
      slides={mobileSlideshow.slides}
      currentSlideIndex={mobileSlideshow.currentSlideIndex}
      loading={loading || mobileSlideshow.loading}
      showSwipeHint={mobileSlideshow.showSwipeHint}
      lang={lang}
      loadingLabel={loadingLabel}
      swipeHintLabel={swipeHintLabel}
      randomQuestionLabel={moreArtistsLabel}
      findNewImageLabel={
        refreshingSlideIndex === mobileSlideshow.currentSlideIndex
          ? "..."
          : findNewImageLabel
      }
      editInStudioLabel={editInCatsLabel}
      closeLabel={closeGalleryLabel}
      onClose={handleClose}
      onIndexChange={mobileSlideshow.goToSlide}
      onInteract={mobileSlideshow.markInteracted}
      onFindNewImage={handleFindNewImage}
      onEditInStudio={handleEditInCats}
      onRandomQuestion={loadArtwork}
    />
  );
}
