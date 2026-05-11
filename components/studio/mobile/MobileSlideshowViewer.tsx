"use client";

import Image from "next/image";
import { useEffect, type ReactNode } from "react";
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
  lastSlideSecondaryLabel?: string;
  findNewImageLabel: string;
  editInStudioLabel: string;
  closeLabel: string;
  topLeftActionLabel?: string;
  onClose: () => void;
  onIndexChange: (nextIndex: number) => void;
  onInteract: () => void;
  onFindNewImage: (slideIndex: number) => Promise<void> | void;
  onEditInStudio: () => void;
  onRandomQuestion: () => Promise<void> | void;
  onLastSlideSecondary?: () => Promise<void> | void;
  onTopLeftAction?: () => Promise<void> | void;
  renderSlideHeader?: (slide: StudioSlide, slideIndex: number) => ReactNode;
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
  lastSlideSecondaryLabel,
  findNewImageLabel,
  editInStudioLabel,
  closeLabel,
  topLeftActionLabel,
  onClose,
  onIndexChange,
  onInteract,
  onFindNewImage,
  onEditInStudio,
  onRandomQuestion,
  onLastSlideSecondary,
  onTopLeftAction,
  renderSlideHeader,
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
  const isRtl = lang === "he";
  const captionClassName =
    isRtl
      ? "mobile-slideshow-caption mobile-slideshow-caption-he"
      : "mobile-slideshow-caption mobile-slideshow-caption-latin";

  return (
    <div className="mobile-slideshow-viewer" role="dialog" aria-modal="true" aria-label={closeLabel}>
      <div className="mobile-slideshow-topbar">
        {topLeftActionLabel ? (
          <button
            type="button"
            className="mobile-slideshow-top-left-action"
            onClick={() => {
              onInteract();
              void onTopLeftAction?.();
            }}
          >
            {topLeftActionLabel}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
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
            <Image
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
                isRtl={isRtl}
                onIndexChange={onIndexChange}
                onInteract={onInteract}
              >
                {slides.map((slide, slideIndex) => (
                  <div key={slide.id} className="mobile-slideshow-page">
                    {renderSlideHeader ? renderSlideHeader(slide, slideIndex) : null}
                    <div className="mobile-slideshow-media-shell">
                      <div
                        className="mobile-slideshow-media-frame"
                        style={{ background: slide.bgColor || "#f7f7f7" }}
                      >
                        <StudioSlideMedia
                          slide={{ ...slide, mediaFit: "contain" }}
                          autoPlayVideo={slideIndex === currentSlideIndex}
                        />
                      </div>
                    </div>
                    <div
                      className={captionClassName}
                      dir={isRtl ? "rtl" : "ltr"}
                      dangerouslySetInnerHTML={{ __html: slide.text }}
                    />
                  </div>
                ))}
              </SwipeLayer>

              {showSwipeHint ? (
                <div className="mobile-slideshow-hint" aria-hidden="true">
                  <span className="mobile-slideshow-hint-text">{swipeHintLabel}</span>
                  <span className="mobile-slideshow-hint-arrow">{isRtl ? "←" : "→"}</span>
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
              {isLastSlide && lastSlideSecondaryLabel ? (
                <button
                  type="button"
                  className="mobile-slideshow-random mobile-slideshow-random-secondary"
                  onClick={() => {
                    onInteract();
                    void onLastSlideSecondary?.();
                  }}
                >
                  {lastSlideSecondaryLabel}
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
