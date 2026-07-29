import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import type { Lang } from "@/i18n";
import type { MapPopupSlide } from "@/types/mapPopup";
import type { StudioSlide } from "@/types/studio";

function getEmptyStateText(lang: Lang): string {
  switch (lang) {
    case "ru":
      return "Енотики ещё не изучили это место на карте, но уже изучают его.";
    case "he":
      return "הראקונים עדיין לא חקרו את המקום הזה במפה, אבל כבר עובדים על זה.";
    default:
      return "Raccoons have not explored this place on the map yet, but they are already working on it.";
  }
}

const EMPTY_STATE_GIF_URL =
  "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/raccoons/raccoon_with_map/raccoon-with-map.gif";

type MapPopupProps = {
  isOpen: boolean;
  loading: boolean;
  lang: Lang;
  slides: MapPopupSlide[];
  currentSlideIndex: number;
  loadingLabel: string;
  closeLabel: string;
  swipeHintLabel: string;
  findNewImageLabel: string;
  editInStudioLabel: string;
  showOnMapLabel: string;
  watchYoutubeLabel: string;
  openTextPageLabel: string;
  canWatchYoutube: boolean;
  flagImageUrl?: string | null;
  flagLabel?: string | null;
  onClose: () => void;
  onIndexChange: (nextIndex: number) => void;
  onFindNewImage: (slideIndex: number) => Promise<void> | void;
  onEditInStudio: () => void;
  onShowOnMap: () => void;
  onWatchYoutube: () => void;
  onOpenTextPage: () => void;
};

function toViewerSlides(slides: MapPopupSlide[]): StudioSlide[] {
  return slides.map((slide) => {
    const mediaUrl = typeof slide.imageUrl === "string" ? slide.imageUrl.trim() : "";
    const mediaType =
      slide.mediaType === "video" || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(mediaUrl)
        ? "video"
        : "image";

    return {
      id: slide.id,
      text: slide.text || "",
      mediaUrl: mediaUrl || undefined,
      mediaType,
      mediaFit: "contain",
      bgColor: "#ffffff",
      textColor: "#111111",
    };
  });
}

export default function MapPopup({
  isOpen,
  loading,
  lang,
  slides,
  currentSlideIndex,
  loadingLabel,
  closeLabel,
  swipeHintLabel,
  findNewImageLabel,
  editInStudioLabel,
  showOnMapLabel,
  watchYoutubeLabel,
  openTextPageLabel,
  canWatchYoutube,
  flagImageUrl,
  flagLabel,
  onClose,
  onIndexChange,
  onFindNewImage,
  onEditInStudio,
  onShowOnMap,
  onWatchYoutube,
  onOpenTextPage,
}: MapPopupProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [mediaStateById, setMediaStateById] = useState<
    Record<string, "loading" | "ready" | "error">
  >({});
  const [retryById, setRetryById] = useState<Record<string, number>>({});

  const effectiveSlides = useMemo<MapPopupSlide[]>(() => {
    if (loading || slides.length > 0) {
      return slides;
    }

    return [
      {
        id: "empty-state-slide",
        index: 0,
        text: getEmptyStateText(lang),
        imageUrl: EMPTY_STATE_GIF_URL,
        imageCreditLine: null,
        imageAuthor: null,
        imageSourceUrl: null,
      },
    ];
  }, [lang, loading, slides]);

  const viewerSlides = useMemo(() => toViewerSlides(effectiveSlides), [effectiveSlides]);

  useEffect(() => {
    if (isOpen) {
      setHasInteracted(false);
    }
  }, [isOpen, slides.length]);

  const markMediaReady = (slideIndex: number) => {
    const slide = viewerSlides[slideIndex];
    if (!slide) {
      return;
    }

    setMediaStateById((current) => ({ ...current, [slide.id]: "ready" }));

    const nextSlide = viewerSlides[slideIndex + 1];
    if (!nextSlide?.mediaUrl || typeof window === "undefined") {
      return;
    }

    if (nextSlide.mediaType === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = nextSlide.mediaUrl;
      return;
    }

    const image = new window.Image();
    image.decoding = "async";
    image.src = nextSlide.mediaUrl;
  };

  return (
    <MobileSlideshowViewer
      isOpen={isOpen}
      slides={viewerSlides}
      currentSlideIndex={currentSlideIndex}
      loading={loading}
      showSwipeHint={isOpen && !loading && viewerSlides.length > 1 && !hasInteracted}
      lang={lang}
      loadingLabel={loadingLabel}
      swipeHintLabel={swipeHintLabel}
      randomQuestionLabel={showOnMapLabel}
      lastSlideSecondaryLabel={canWatchYoutube ? watchYoutubeLabel : ""}
      findNewImageLabel={findNewImageLabel}
      editInStudioLabel={editInStudioLabel}
      closeLabel={closeLabel}
      className="map-popup-mobile-viewer"
      topLeftActionLabel={openTextPageLabel}
      onClose={onClose}
      onIndexChange={onIndexChange}
      onInteract={() => setHasInteracted(true)}
      onFindNewImage={onFindNewImage}
      onEditInStudio={onEditInStudio}
      onRandomQuestion={onShowOnMap}
      onLastSlideSecondary={onWatchYoutube}
      onTopLeftAction={onOpenTextPage}
      renderSlideMedia={(slide, slideIndex) => {
        if (!slide.mediaUrl) {
          return null;
        }

        const isCurrent = slideIndex === currentSlideIndex;
        const mediaState = mediaStateById[slide.id] || "loading";
        const retryKey = retryById[slide.id] || 0;

        return (
          <>
            {mediaState === "loading" && isCurrent ? (
              <div className="map-popup-media-skeleton" aria-hidden="true" />
            ) : null}
            {mediaState === "error" && isCurrent ? (
              <div className="map-popup-media-error" role="status">
                <span>
                  {lang === "ru"
                    ? "Медиа не загрузилось."
                    : lang === "he"
                      ? "המדיה לא נטענה."
                      : "Media could not be loaded."}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMediaStateById((current) => ({
                      ...current,
                      [slide.id]: "loading",
                    }));
                    setRetryById((current) => ({
                      ...current,
                      [slide.id]: (current[slide.id] || 0) + 1,
                    }));
                  }}
                >
                  {lang === "ru" ? "Повторить" : lang === "he" ? "לנסות שוב" : "Retry"}
                </button>
              </div>
            ) : null}
            {slide.mediaType === "video" ? (
              <video
                key={`${slide.id}:${slide.mediaUrl}:${retryKey}`}
                src={slide.mediaUrl}
                className="map-popup-mobile-media"
                autoPlay={isCurrent}
                muted
                loop
                playsInline
                preload={isCurrent ? "auto" : "none"}
                onLoadedData={() => markMediaReady(slideIndex)}
                onError={() =>
                  setMediaStateById((current) => ({
                    ...current,
                    [slide.id]: "error",
                  }))
                }
              />
            ) : (
              <Image
                key={`${slide.id}:${slide.mediaUrl}:${retryKey}`}
                src={slide.mediaUrl}
                alt={slide.text?.trim() || ""}
                fill
                unoptimized
                priority={isCurrent}
                loading={isCurrent ? "eager" : "lazy"}
                fetchPriority={isCurrent ? "high" : "auto"}
                decoding="async"
                sizes="(max-width: 768px) 100vw, 720px"
                className="map-popup-mobile-media"
                onLoad={() => markMediaReady(slideIndex)}
                onError={() =>
                  setMediaStateById((current) => ({
                    ...current,
                    [slide.id]: "error",
                  }))
                }
              />
            )}
          </>
        );
      }}
      renderSlideHeader={
        flagImageUrl
          ? (_slide, slideIndex) =>
              slideIndex === 0 ? (
                <div className="mobile-slideshow-flag-header">
                  <Image
                    src={flagImageUrl}
                    alt={flagLabel || ""}
                    width={160}
                    height={100}
                    className="mobile-slideshow-flag-image"
                    unoptimized
                  />
                  {flagLabel ? (
                    <span className="mobile-slideshow-flag-label">{flagLabel}</span>
                  ) : null}
                </div>
              ) : null
          : undefined
      }
    />
  );
}
