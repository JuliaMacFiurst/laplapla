import { useMemo } from "react";
import MobileSlideshowViewer from "@/components/studio/mobile/MobileSlideshowViewer";
import type { Lang } from "@/i18n";
import type { StorySlide } from "@/lib/story/story-shared";
import type { StudioSlide } from "@/types/studio";

type SlideMedia = {
  type: "image" | "video" | "gif";
  capybaraImage?: string;
  capybaraImageAlt?: string;
  gifUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
};

interface MobileGeneratedStoryViewerProps {
  lang: Lang;
  title: string;
  slides: StorySlide[];
  currentSlideIndex: number;
  mediaCache: ReadonlyMap<number, SlideMedia>;
  onSlideIndexChange: (slideIndex: number) => void;
  onOpenEditor: () => void;
  onReset: () => void;
  openEditorLabel: string;
  tryAnotherLabel: string;
}

function toViewerSlides(
  title: string,
  slides: StorySlide[],
  mediaCache: ReadonlyMap<number, SlideMedia>,
): StudioSlide[] {
  return slides.map((slide, index) => {
    const media = mediaCache.get(index);
    return {
      id: `${title}-${index}`,
      text: slide.text,
      mediaUrl: media?.videoUrl || media?.gifUrl || media?.capybaraImage || media?.imageUrl,
      mediaType: media?.videoUrl ? "video" : "image",
      mediaFit: "contain",
      bgColor: "#ffffff",
      textColor: "#111111",
    };
  });
}

export default function MobileGeneratedStoryViewer({
  lang,
  title,
  slides,
  currentSlideIndex,
  mediaCache,
  onSlideIndexChange,
  onOpenEditor,
  onReset,
  openEditorLabel,
  tryAnotherLabel,
}: MobileGeneratedStoryViewerProps) {
  const viewerSlides = useMemo(
    () => toViewerSlides(title, slides, mediaCache),
    [mediaCache, slides, title],
  );

  return (
    <MobileSlideshowViewer
      isOpen
      slides={viewerSlides}
      currentSlideIndex={currentSlideIndex}
      loading={false}
      showSwipeHint={viewerSlides.length > 1}
      lang={lang}
      loadingLabel=""
      swipeHintLabel=""
      randomQuestionLabel=""
      findNewImageLabel={tryAnotherLabel}
      editInStudioLabel={openEditorLabel}
      closeLabel="Close"
      onClose={onReset}
      onIndexChange={onSlideIndexChange}
      onInteract={() => {}}
      onFindNewImage={() => onReset()}
      onEditInStudio={onOpenEditor}
      onRandomQuestion={() => {}}
    />
  );
}
