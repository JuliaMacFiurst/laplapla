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
    const mediaType = mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") ? "video" : "image";

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
      topLeftActionLabel={openTextPageLabel}
      onClose={onClose}
      onIndexChange={onIndexChange}
      onInteract={() => setHasInteracted(true)}
      onFindNewImage={onFindNewImage}
      onEditInStudio={onEditInStudio}
      onRandomQuestion={onShowOnMap}
      onLastSlideSecondary={onWatchYoutube}
      onTopLeftAction={onOpenTextPage}
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
