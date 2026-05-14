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
import type { StudioSlide } from "@/types/studio";

type MobileArtGalleryProps = {
  categorySlug: string;
  isOpen: boolean;
  onClose: () => void;
};

function getFallbackArtwork(lang: Lang, categorySlug: string): Artwork {
  const description =
    lang === "he"
      ? "פיבי מזמינה אותך להסתכל על הציור שלך כמו באוסף קטן. בחרו צבעים, שימו לב לפרטים, ואז נסו לצייר גרסה חדשה."
      : lang === "en"
        ? "Fibi invites you to look at your drawing like a tiny gallery piece. Notice the colors, details, and mood, then try a new version."
        : "Фиби приглашает посмотреть на рисунок как на маленькую галерею. Заметь цвета, детали и настроение, а потом попробуй новую версию.";

  return {
    id: `fallback-${categorySlug}-${lang}`,
    title: "Fibi Gallery",
    description,
    image_url: ["/dog/fibi.webp"],
  };
}

function buildFallbackSlides(artwork: Artwork): StudioSlide[] {
  return [
    {
      id: `${artwork.id}-fibi`,
      text: stripHtml(artwork.description),
      mediaUrl: "/dog/fibi.webp",
      mediaType: "image",
      mediaFit: "contain",
      bgColor: "#ffffff",
      textColor: "#111111",
    },
  ];
}

export default function MobileArtGallery({
  categorySlug,
  isOpen,
  onClose,
}: MobileArtGalleryProps) {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const mobileSlideshow = useMobileSlideshow();
  const {
    close: closeSlideshow,
    currentSlideIndex,
    goToSlide,
    isOpen: isSlideshowOpen,
    loading: slideshowLoading,
    markInteracted,
    open: openSlideshow,
    replaceSlides,
    setLoading: setSlideshowLoading,
    showSwipeHint,
    slides,
    updateSlides,
  } = mobileSlideshow;
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
    openSlideshow({ loading: true });

    try {
      const response = await fetch(
        `/api/art-gallery?categorySlug=${encodeURIComponent(categorySlug)}&lang=${lang}&excludeIds=${encodeURIComponent(usedArtworkIdsRef.current.join(","))}`,
      );
      const payload = (await response.json()) as {
        artwork: Artwork | null;
        error?: string;
      };

      if (!response.ok || !payload.artwork) {
        const fallbackArtwork = getFallbackArtwork(lang, categorySlug);
        setArtwork(fallbackArtwork);
        const fallbackSlides = buildFallbackSlides(fallbackArtwork);
        replaceSlides(fallbackSlides);
        return;
      }

      setArtwork(payload.artwork);
      setUsedArtworkIds((current) =>
        current.includes(payload.artwork!.id)
          ? current
          : [...current, payload.artwork!.id],
      );
      const slides = await buildArtworkSlides(payload.artwork, fallbackHints);
      replaceSlides(slides.length > 0 ? slides : buildFallbackSlides(payload.artwork));
    } catch (error) {
      console.warn("Using fallback mobile art gallery", error);
      const fallbackArtwork = getFallbackArtwork(lang, categorySlug);
      setArtwork(fallbackArtwork);
      setUsedArtworkIds((current) =>
        current.includes(fallbackArtwork.id)
          ? current
          : [...current, fallbackArtwork.id],
      );
      replaceSlides(buildFallbackSlides(fallbackArtwork));
    } finally {
      setLoading(false);
      setSlideshowLoading(false);
    }
  }, [categorySlug, fallbackHints, lang, openSlideshow, replaceSlides, setSlideshowLoading]);

  useEffect(() => {
    if (!isOpen) {
      closeSlideshow();
      usedArtworkIdsRef.current = [];
      setUsedArtworkIds([]);
      return;
    }

    void loadArtwork();
  }, [closeSlideshow, isOpen, loadArtwork]);

  const handleFindNewImage = async (slideIndex: number) => {
    const slide = slides[slideIndex];
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

      updateSlides(
        slides.map((currentSlide, index) =>
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
        slides.map((slide) => ({
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
    closeSlideshow();
    onClose();
  };

  return (
    <MobileSlideshowViewer
      isOpen={isOpen && isSlideshowOpen}
      slides={slides}
      currentSlideIndex={currentSlideIndex}
      loading={loading || slideshowLoading}
      showSwipeHint={showSwipeHint}
      lang={lang}
      loadingLabel={loadingLabel}
      swipeHintLabel={swipeHintLabel}
      randomQuestionLabel={moreArtistsLabel}
      findNewImageLabel={
        refreshingSlideIndex === currentSlideIndex
          ? "..."
          : findNewImageLabel
      }
      editInStudioLabel={editInCatsLabel}
      closeLabel={closeGalleryLabel}
      onClose={handleClose}
      onIndexChange={goToSlide}
      onInteract={markInteracted}
      onFindNewImage={handleFindNewImage}
      onEditInStudio={handleEditInCats}
      onRandomQuestion={loadArtwork}
    />
  );
}
