"use client";

import { useEffect } from "react";
import { StudioSlideMedia } from "@/components/studio/StudioPreviewPlayer";
import type { Lang } from "@/i18n";
import type { StudioSlide } from "@/types/studio";
import SwipeLayer from "./SwipeLayer";

interface MobileSlideshowViewerProps {
  isOpen: boolean;
  slides: StudioSlide[];
  currentSlideIndex: number;
  loading: boolean;
  showSwipeHint: boolean;
  lang: Lang;
  loadingLabel: string;
  swipeHintLabel: string;
  randomQuestionLabel: string;
  findNewImageLabel: string;
  editInStudioLabel: string;
  closeLabel: string;
  onClose: () => void;
  onIndexChange: (nextIndex: number) => void;
  onInteract: () => void;
  onFindNewImage: (slideIndex: number) => Promise<void> | void;
  onEditInStudio: () => void;
  onRandomQuestion: () => Promise<void> | void;
}

export default function MobileSlideshowViewer({
  isOpen,
  slides,
  currentSlideIndex,
  loading,
  showSwipeHint,
  lang,
  loadingLabel,
  swipeHintLabel,
  randomQuestionLabel,
  findNewImageLabel,
  editInStudioLabel,
  closeLabel,
  onClose,
  onIndexChange,
  onInteract,
  onFindNewImage,
  onEditInStudio,
  onRandomQuestion,
}: MobileSlideshowViewerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isLastSlide = slides.length > 0 && currentSlideIndex === slides.length - 1;
  const captionClassName =
    lang === "he"
      ? "mobile-slideshow-caption mobile-slideshow-caption-he"
      : "mobile-slideshow-caption mobile-slideshow-caption-latin";

  return (
    <div className="mobile-slideshow-viewer" role="dialog" aria-modal="true" aria-label={closeLabel}>
      <div className="mobile-slideshow-topbar">
        <button
          type="button"
          className="mobile-slideshow-close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          ×
        </button>
      </div>

      <div className="mobile-slideshow-body">
        {loading ? (
          <div className="mobile-slideshow-loading">
            <img
              src="/spinners/CatSpinner.svg"
              alt=""
              width={64}
              height={64}
              aria-hidden="true"
            />
            <p>{loadingLabel}</p>
          </div>
        ) : (
          <>
            <div className="mobile-slideshow-stage">
              <SwipeLayer
                currentIndex={currentSlideIndex}
                totalSlides={slides.length}
                onIndexChange={onIndexChange}
                onInteract={onInteract}
              >
                {slides.map((slide) => (
                  <div key={slide.id} className="mobile-slideshow-page">
                    <div className="mobile-slideshow-media-shell">
                      <div
                        className="mobile-slideshow-media-frame"
                        style={{ background: slide.bgColor || "#f7f7f7" }}
                      >
                        <StudioSlideMedia
                          slide={{ ...slide, mediaFit: "contain" }}
                          autoPlayVideo={false}
                        />
                      </div>
                    </div>
                    <div
                      className={captionClassName}
                      dangerouslySetInnerHTML={{ __html: slide.text }}
                    />
                  </div>
                ))}
              </SwipeLayer>

              {showSwipeHint ? (
                <div className="mobile-slideshow-hint" aria-hidden="true">
                  <span className="mobile-slideshow-hint-text">{swipeHintLabel}</span>
                  <span className="mobile-slideshow-hint-arrow">→</span>
                </div>
              ) : null}
            </div>

            <div className="mobile-slideshow-controls">
              {isLastSlide && randomQuestionLabel ? (
                <button
                  type="button"
                  className="mobile-slideshow-random"
                  onClick={() => {
                    onInteract();
                    void onRandomQuestion();
                  }}
                >
                  {randomQuestionLabel}
                </button>
              ) : null}

              <div className="mobile-slideshow-actions">
                {findNewImageLabel ? (
                  <button
                    type="button"
                    className="mobile-slideshow-action"
                    onClick={() => {
                      onInteract();
                      void onFindNewImage(currentSlideIndex);
                    }}
                  >
                    {findNewImageLabel}
                  </button>
                ) : null}
                {editInStudioLabel ? (
                  <button
                    type="button"
                    className="mobile-slideshow-action mobile-slideshow-action-primary"
                    onClick={() => {
                      onInteract();
                      onEditInStudio();
                    }}
                  >
                    {editInStudioLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
