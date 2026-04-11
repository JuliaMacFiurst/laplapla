"use client";

import { startTransition, useCallback, useState } from "react";
import type { StudioSlide } from "@/types/studio";

interface OpenMobileSlideshowOptions {
  slides?: StudioSlide[];
  loading?: boolean;
}

export function useMobileSlideshow() {
  const [isOpen, setIsOpen] = useState(false);
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const open = useCallback((options?: OpenMobileSlideshowOptions) => {
    setIsOpen(true);
    setCurrentSlideIndex(0);
    setHasInteracted(false);
    setSlides(options?.slides ?? []);
    setLoading(options?.loading ?? false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setLoading(false);
  }, []);

  const replaceSlides = useCallback((nextSlides: StudioSlide[]) => {
    startTransition(() => {
      setSlides(nextSlides);
      setCurrentSlideIndex(0);
      setLoading(false);
      setHasInteracted(false);
    });
  }, []);

  const updateSlides = useCallback((nextSlides: StudioSlide[]) => {
    startTransition(() => {
      setSlides(nextSlides);
    });
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlideIndex((currentIndex) => {
      const maxIndex = Math.max(0, slides.length - 1);
      const safeIndex = Math.min(Math.max(index, 0), maxIndex);
      return safeIndex === currentIndex ? currentIndex : safeIndex;
    });
  }, [slides.length]);

  const markInteracted = useCallback(() => {
    setHasInteracted(true);
  }, []);

  return {
    isOpen,
    slides,
    currentSlideIndex,
    loading,
    showSwipeHint: isOpen && !loading && slides.length > 1 && !hasInteracted,
    open,
    close,
    replaceSlides,
    updateSlides,
    goToSlide,
    setLoading,
    markInteracted,
  };
}
