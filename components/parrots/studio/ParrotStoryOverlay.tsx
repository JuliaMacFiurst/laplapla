import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import {
  findAlternativeParrotStoryMedia,
  resolveParrotStorySlidesWithMedia,
  type ParrotStorySlide,
} from "@/lib/parrotStoryMedia";
import { buildStudioHref } from "@/lib/studioRouting";
import type { StudioSlide } from "@/types/studio";

type Props = {
  title: string;
  lang: "ru" | "en" | "he";
  styleSlug: string;
  slides: ParrotStorySlide[];
  onClose: () => void;
};

const COPY = {
  ru: {
    loading: "Подбираем слайды...",
    close: "Закрыть историю",
    swipe: "Свайпни, чтобы листать",
    findNewImage: "Найти новую картинку",
    editInStudio: "Редактировать в студии",
  },
  en: {
    loading: "Preparing slides...",
    close: "Close story",
    swipe: "Swipe to continue",
    findNewImage: "Find new image",
    editInStudio: "Edit in studio",
  },
  he: {
    loading: "מכינים את השקופיות...",
    close: "לסגור סיפור",
    swipe: "החליקו כדי להמשיך",
    findNewImage: "למצוא תמונה חדשה",
    editInStudio: "לערוך בסטודיו",
  },
} as const;

function toViewerSlides(title: string, slides: ParrotStorySlide[]): StudioSlide[] {
  return slides.map((slide, index) => ({
    id: `${title}-${index}`,
    text: slide.text,
    mediaUrl: slide.mediaUrl,
    mediaType: slide.mediaType === "video" ? "video" : "image",
    mediaFit: "contain",
    bgColor: "#ffffff",
    textColor: "#111111",
  }));
}

export default function ParrotStoryOverlay({ title, lang, styleSlug, slides, onClose }: Props) {
  const router = useRouter();
  const copy = COPY[lang] ?? COPY.ru;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedSlides, setResolvedSlides] = useState<ParrotStorySlide[]>(slides);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCurrentSlideIndex(0);
    setResolvedSlides(slides);

    void (async () => {
      try {
        const nextSlides = await resolveParrotStorySlidesWithMedia(styleSlug, slides);
        if (!cancelled) {
          setResolvedSlides(nextSlides);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slides, styleSlug]);

  const viewerSlides = useMemo(
    () => toViewerSlides(title, resolvedSlides),
    [resolvedSlides, title],
  );

  const handleFindNewImage = async (slideIndex: number) => {
    const currentSlide = resolvedSlides[slideIndex];
    if (!currentSlide || refreshing) return;

    setRefreshing(true);
    try {
      const alternative = await findAlternativeParrotStoryMedia(
        styleSlug,
        currentSlide,
        slideIndex,
        resolvedSlides.length,
        currentSlide.mediaUrl ? [currentSlide.mediaUrl] : [],
      );

      if (!alternative) return;

      setResolvedSlides((current) =>
        current.map((slide, index) =>
          index === slideIndex
            ? {
                ...slide,
                mediaUrl: alternative.url,
                mediaType: alternative.mediaType,
              }
            : slide,
        ),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditInStudio = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "catsSlides",
        JSON.stringify(
          resolvedSlides.map((slide) => ({
            text: slide.text,
            image: slide.mediaUrl,
            mediaUrl: slide.mediaUrl,
            mediaType: slide.mediaType === "video" ? "video" : "image",
            mediaFit: "contain",
            mediaPosition: "center",
            textPosition: "bottom",
            textAlign: "center",
          })),
        ),
      );
    }

    void router.push(buildStudioHref("cats", lang), undefined, { locale: lang });
  };

  return (
    <MobileSlideshowViewer
      isOpen
      slides={viewerSlides}
      currentSlideIndex={currentSlideIndex}
      loading={loading}
      showSwipeHint={!loading && viewerSlides.length > 1}
      lang={lang}
      loadingLabel={copy.loading}
      swipeHintLabel={copy.swipe}
      randomQuestionLabel=""
      findNewImageLabel={refreshing ? "..." : copy.findNewImage}
      editInStudioLabel={copy.editInStudio}
      closeLabel={copy.close}
      onClose={onClose}
      onIndexChange={setCurrentSlideIndex}
      onInteract={() => {}}
      onFindNewImage={handleFindNewImage}
      onEditInStudio={handleEditInStudio}
      onRandomQuestion={() => {}}
    />
  );
}
