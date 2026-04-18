import { useEffect, useMemo, useState } from "react";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import { resolveParrotStorySlidesWithMedia, type ParrotStorySlide } from "@/lib/parrotStoryMedia";
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
  },
  en: {
    loading: "Preparing slides...",
    close: "Close story",
    swipe: "Swipe to continue",
  },
  he: {
    loading: "מכינים את השקופיות...",
    close: "לסגור סיפור",
    swipe: "החליקו כדי להמשיך",
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
  const copy = COPY[lang] ?? COPY.ru;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedSlides, setResolvedSlides] = useState<ParrotStorySlide[]>(slides);

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
      findNewImageLabel=""
      editInStudioLabel=""
      closeLabel={copy.close}
      onClose={onClose}
      onIndexChange={setCurrentSlideIndex}
      onInteract={() => {}}
      onFindNewImage={() => {}}
      onEditInStudio={() => {}}
      onRandomQuestion={() => {}}
    />
  );
}
