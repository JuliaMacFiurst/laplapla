import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import TranslationWarning from "@/components/TranslationWarning";
import { getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioHref } from "@/lib/studioRouting";
import {
  buildArtworkSlides,
  findArtworkSlideAlternativeMedia,
  type Artwork,
} from "@/lib/dogs/artGallerySlides";
import { dictionaries, Lang } from "../i18n/index";
import type { StudioSlide } from "@/types/studio";

interface ArtGalleryModalProps {
  categorySlug: string;
  onClose: () => void;
}

const ArtGalleryModal = ({ categorySlug, onClose }: ArtGalleryModalProps) => {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.dogs.artGalleryModal;
  const modalRef = useRef<HTMLDivElement>(null);
  const [usedArtworkIds, setUsedArtworkIds] = useState<string[]>([]);
  const usedArtworkIdsRef = useRef<string[]>([]);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [slides, setSlides] = useState<StudioSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshingSlideIndex, setRefreshingSlideIndex] = useState<number | null>(
    null,
  );
  const [isArtworkTranslated, setIsArtworkTranslated] = useState(true);
  const fallbackHints = useMemo(
    () => ["yorkshire terrier", "yorkie", "dog"],
    [],
  );
  const editInCatsLabel = t.editInCats;

  useEffect(() => {
    usedArtworkIdsRef.current = usedArtworkIds;
  }, [usedArtworkIds]);

  const loadArtwork = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/art-gallery?categorySlug=${encodeURIComponent(categorySlug)}&lang=${lang}&excludeIds=${encodeURIComponent(usedArtworkIdsRef.current.join(","))}`,
      );
      const payload = (await response.json()) as {
        artwork: Artwork | null;
        translated: boolean;
        error?: string;
      };

      if (!response.ok || !payload.artwork) {
        throw new Error(payload.error || "Failed to load gallery");
      }

      setArtwork(payload.artwork);
      setIsArtworkTranslated(payload.translated);
      setUsedArtworkIds((current) =>
        current.includes(payload.artwork!.id)
          ? current
          : [...current, payload.artwork!.id],
      );
      const nextSlides = await buildArtworkSlides(payload.artwork, fallbackHints);
      setSlides(nextSlides);
      setCurrentSlideIndex(0);
    } catch (fetchError) {
      console.error("Failed to load desktop art gallery", fetchError);
      setArtwork(null);
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, fallbackHints, lang]);

  useEffect(() => {
    void loadArtwork();
  }, [loadArtwork]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const handleFindNewImage = async () => {
    const slide = slides[currentSlideIndex];
    if (!slide) return;

    setRefreshingSlideIndex(currentSlideIndex);

    try {
      const alternative = await findArtworkSlideAlternativeMedia({
        fallbackHints,
        artworkTitle: artwork?.title || "",
        slideText: slide.text,
        excludedUrls: slide.mediaUrl ? [slide.mediaUrl] : [],
        preferYorkie: currentSlideIndex % 2 === 0,
      });

      if (!alternative?.url) {
        return;
      }

      setSlides((current) =>
        current.map((currentSlide, index) =>
          index === currentSlideIndex
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
        current === currentSlideIndex ? null : current,
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

  const currentSlide = slides[currentSlideIndex] || null;
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;
  const isVideoSlide =
    currentSlide?.mediaType === "video" ||
    Boolean(currentSlide?.mediaUrl?.match(/\.(mp4|webm|ogg|mov)(\?|#|$)/i));

  return (
    <div className="art-gallery-modal" ref={modalRef}>
      <button className="art-gallery-close" onClick={onClose} aria-label={t.closeGallery}>
        &times;
      </button>
      <h2 className="art-gallery-title">{t.artGalleryTitle}</h2>
      {!isArtworkTranslated && lang !== "ru" ? <TranslationWarning lang={lang} /> : null}

      {loading ? (
        <p className="art-gallery-empty">{t.loadingGallery}</p>
      ) : currentSlide ? (
        <div className="art-gallery-slideshow">
          <div className="art-gallery-stage">
            <button
              type="button"
              className="art-gallery-nav"
              onClick={() => setCurrentSlideIndex((index) => Math.max(0, index - 1))}
              disabled={!canGoPrev}
              aria-label="Previous slide"
            >
              ‹
            </button>

            <div className="art-gallery-slide">
              <div className="art-gallery-media-card">
                {isVideoSlide && currentSlide.mediaUrl ? (
                  <video
                    key={currentSlide.id}
                    src={currentSlide.mediaUrl}
                    autoPlay
                    muted
                    loop
                    controls
                    playsInline
                    className="art-gallery-media"
                  />
                ) : currentSlide.mediaUrl ? (
                  <Image
                    key={currentSlide.id}
                    src={currentSlide.mediaUrl}
                    alt={artwork?.title || t.artGalleryTitle}
                    width={960}
                    height={720}
                    unoptimized
                    className="art-gallery-media"
                  />
                ) : (
                  <div className="art-gallery-media art-gallery-media-empty" />
                )}
              </div>

              <div className="art-gallery-text-card">
                <div className="art-gallery-slide-counter">
                  {currentSlideIndex + 1} / {slides.length}
                </div>
                <h3>{artwork?.title}</h3>
                <p>{currentSlide.text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")}</p>
                <div className="art-gallery-actions">
                  <button
                    type="button"
                    className="art-gallery-action"
                    onClick={handleFindNewImage}
                  >
                    {refreshingSlideIndex === currentSlideIndex ? "..." : t.findNewImage}
                  </button>
                  <button
                    type="button"
                    className="art-gallery-action art-gallery-action-secondary"
                    onClick={handleEditInCats}
                  >
                    {editInCatsLabel}
                  </button>
                  <button
                    type="button"
                    className="art-gallery-action art-gallery-action-secondary"
                    onClick={() => void loadArtwork()}
                  >
                    {t.moreArtists}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="art-gallery-nav"
              onClick={() =>
                setCurrentSlideIndex((index) => Math.min(slides.length - 1, index + 1))
              }
              disabled={!canGoNext}
              aria-label="Next slide"
            >
              ›
            </button>
          </div>
        </div>
      ) : (
        <p className="art-gallery-empty">Пока нет подходящих картин для этой темы.</p>
      )}
    </div>
  );
};

export default ArtGalleryModal;
