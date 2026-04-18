import { useEffect, useMemo, useRef, useState } from "react";

type StorySlide = {
  text: string;
  mediaUrl?: string;
  mediaType?: "gif" | "image" | "video";
};

type Props = {
  title: string;
  lang: "ru" | "en" | "he";
  slides: StorySlide[];
  onClose: () => void;
};

export default function ParrotStoryOverlay({ title, lang, slides, onClose }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeSlides = useMemo(
    () => (slides.length > 0 ? slides : [{ text: "Story is loading..." }]),
    [slides],
  );

  useEffect(() => {
    setActiveIndex(0);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0, behavior: "auto" });
    }
  }, [title, safeSlides.length]);

  const scrollToIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(safeSlides.length - 1, index));
    const node = trackRef.current;
    if (!node) return;

    node.scrollTo({
      left: nextIndex * node.clientWidth,
      behavior: "smooth",
    });
    setActiveIndex(nextIndex);
  };

  const handleScroll = () => {
    const node = trackRef.current;
    if (!node) return;
    const nextIndex = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
    setActiveIndex(nextIndex);
  };

  return (
    <div className={`parrot-story-overlay ${lang === "he" ? "is-rtl" : ""}`} role="dialog" aria-modal="true">
      <div className="parrot-story-overlay__header">
        <div>
          <strong>{title}</strong>
          <p>{activeIndex + 1} / {safeSlides.length}</p>
        </div>
        <button type="button" className="parrot-story-overlay__close" onClick={onClose} aria-label="Close story">
          ×
        </button>
      </div>

      <div className="parrot-story-overlay__track" ref={trackRef} onScroll={handleScroll}>
        {safeSlides.map((slide, index) => (
          <article key={`${index}-${slide.text}`} className="parrot-story-overlay__slide">
            <div className="parrot-story-overlay__card">
              {slide.mediaUrl ? (
                slide.mediaType === "video" ? (
                  <video
                    className="parrot-story-overlay__media"
                    src={slide.mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img className="parrot-story-overlay__media" src={slide.mediaUrl} alt="" />
                )
              ) : (
                <div className="parrot-story-overlay__media parrot-story-overlay__media--empty">
                  <span>Story</span>
                </div>
              )}

              <div className="parrot-story-overlay__text-wrap">
                <p>{slide.text}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="parrot-story-overlay__footer">
        <button type="button" onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0}>
          Prev
        </button>
        <div className="parrot-story-overlay__dots" aria-hidden="true">
          {safeSlides.map((slide, index) => (
            <span
              key={`${slide.text}-${index}`}
              className={index === activeIndex ? "is-active" : ""}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex === safeSlides.length - 1}
        >
          Next
        </button>
      </div>

      <style jsx>{`
        .parrot-story-overlay {
          position: fixed;
          inset: 0;
          z-index: 30;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          background:
            radial-gradient(circle at top, rgba(255, 232, 199, 0.92), transparent 32%),
            linear-gradient(180deg, #fffaf2 0%, #fff3fb 100%);
        }

        .parrot-story-overlay.is-rtl {
          direction: rtl;
        }

        .parrot-story-overlay__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: max(1rem, env(safe-area-inset-top)) 1rem 0.75rem;
        }

        .parrot-story-overlay__header strong {
          display: block;
          color: #402b18;
          font-size: 1.05rem;
        }

        .parrot-story-overlay__header p {
          margin: 0.28rem 0 0;
          color: rgba(64, 43, 24, 0.64);
          font-size: 0.86rem;
        }

        .parrot-story-overlay__close,
        .parrot-story-overlay__footer button {
          min-width: 44px;
          min-height: 44px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(180deg, #fff0d6 0%, #ffd7ef 100%);
          color: #402b18;
          box-shadow: 0 10px 20px rgba(255, 179, 208, 0.18);
        }

        .parrot-story-overlay__close {
          width: 44px;
          font-size: 1.45rem;
          line-height: 1;
        }

        .parrot-story-overlay__track {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          touch-action: pan-x;
        }

        .parrot-story-overlay__track::-webkit-scrollbar {
          display: none;
        }

        .parrot-story-overlay__slide {
          min-width: 100%;
          padding: 0.25rem 1rem 1rem;
          scroll-snap-align: start;
        }

        .parrot-story-overlay__card {
          height: 100%;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 22px 40px rgba(221, 183, 142, 0.16);
          overflow: hidden;
          display: grid;
          grid-template-rows: minmax(220px, 46vh) minmax(0, 1fr);
        }

        .parrot-story-overlay__media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: linear-gradient(180deg, #fff8ea 0%, #ffe1f2 100%);
        }

        .parrot-story-overlay__media--empty {
          display: grid;
          place-items: center;
          color: rgba(64, 43, 24, 0.48);
          font-size: 1.15rem;
        }

        .parrot-story-overlay__text-wrap {
          padding: 1rem 1rem 1.2rem;
          overflow: auto;
        }

        .parrot-story-overlay__text-wrap p {
          margin: 0;
          color: #49311c;
          font-size: 1rem;
          line-height: 1.6;
        }

        .parrot-story-overlay__footer {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0 1rem calc(0.9rem + env(safe-area-inset-bottom));
        }

        .parrot-story-overlay__dots {
          display: flex;
          justify-content: center;
          gap: 0.4rem;
        }

        .parrot-story-overlay__dots span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(73, 49, 28, 0.18);
        }

        .parrot-story-overlay__dots span.is-active {
          width: 22px;
          background: linear-gradient(180deg, #ffc7e5 0%, #ffd27f 100%);
        }

        .parrot-story-overlay__footer button:disabled {
          opacity: 0.36;
        }
      `}</style>
    </div>
  );
}
