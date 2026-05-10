import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import { useMobileSlideshow } from "@/components/studio/mobile/useMobileSlideshow";
import { getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioHref } from "@/lib/studioRouting";
import {
  buildArtworkSlides,
  findArtworkSlideAlternativeMedia,
  type Artwork,
  stripHtml,
} from "@/lib/dogs/artGallerySlides";
import { Lang } from "../../i18n";

type MobileArtGalleryProps = {
  categorySlug: string;
  isOpen: boolean;
  onClose: () => void;
};

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
      const slides = await buildArtworkSlides(payload.artwork, fallbackHints);
      mobileSlideshow.replaceSlides(slides);
    } catch (error) {
      console.error("Failed to load mobile art gallery", error);
      mobileSlideshow.close();
      onClose();
    } finally {
      setLoading(false);
    }
  }, [categorySlug, fallbackHints, lang, mobileSlideshow, onClose]);

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
      const alternative = await findArtworkSlideAlternativeMedia({
        fallbackHints,
        artworkTitle: artwork?.title || "",
        slideText: stripHtml(slide.text),
        excludedUrls: slide.mediaUrl ? [slide.mediaUrl] : [],
        preferYorkie: slideIndex % 2 === 0,
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
