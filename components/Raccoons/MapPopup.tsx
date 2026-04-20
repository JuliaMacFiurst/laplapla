import { useEffect, useMemo, useState } from "react";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import type { Lang } from "@/i18n";
import type { MapPopupSlide } from "@/types/mapPopup";
import type { StudioSlide } from "@/types/studio";

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
  onClose,
  onIndexChange,
  onFindNewImage,
  onEditInStudio,
  onShowOnMap,
  onWatchYoutube,
  onOpenTextPage,
}: MapPopupProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const viewerSlides = useMemo(() => toViewerSlides(slides), [slides]);

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
    />
  );
}
