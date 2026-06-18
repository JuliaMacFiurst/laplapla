import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { BedtimeStory } from "@/lib/bedtimeStories";
import type { Lang } from "@/i18n";
import { trackEvent } from "@/lib/analytics/client";

type ReaderUi = {
  close: string;
  previous: string;
  next: string;
  counter: string;
};

export default function BedtimeStoryReaderModal({
  story,
  lang,
  ui,
  onClose,
}: {
  story: BedtimeStory;
  lang: Lang;
  ui: ReaderUi;
  onClose: () => void;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const completionTrackedRef = useRef(false);
  const isRtl = lang === "he";
  const pageCount = story.pageUrls.length;
  const counter = ui.counter
    .replace("{current}", String(pageIndex + 1))
    .replace("{total}", String(pageCount));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        setPageIndex((current) => Math.max(0, current - 1));
      } else if (event.key === "ArrowRight") {
        setPageIndex((current) => Math.min(pageCount - 1, current + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, pageCount]);

  useEffect(() => {
    setIsPageLoading(true);
    const nextPageUrl = story.pageUrls[pageIndex + 1];
    if (nextPageUrl) {
      const nextPage = new window.Image();
      nextPage.src = nextPageUrl;
    }
  }, [pageIndex, story.pageUrls]);

  useEffect(() => {
    if (completionTrackedRef.current || pageCount <= 0 || pageIndex < pageCount - 1) {
      return;
    }

    completionTrackedRef.current = true;
    trackEvent({
      eventName: "bedtime_story_completed",
      entityType: "story",
      entityId: story.slug || story.id,
      entityTitle: story.title,
      lang,
      properties: {
        section: "bedtime_stories",
        content_type: "bedtime_story",
        content_id: story.slug || story.id,
        content_slug: story.slug || story.id,
        content_title: story.title,
        language: lang,
        completion_percent: 100,
        step_index: pageIndex + 1,
        total_steps: pageCount,
      },
    });
    trackEvent("content_complete", {
      section: "bedtime_stories",
      content_type: "bedtime_story",
      content_id: story.slug || story.id,
      content_slug: story.slug || story.id,
      content_title: story.title,
      language: lang,
      completion_percent: 100,
      step_index: pageIndex + 1,
      total_steps: pageCount,
    });
  }, [lang, pageCount, pageIndex, story.id, story.slug, story.title]);

  useEffect(() => {
    if (pageCount <= 1) {
      return;
    }

    trackEvent("content_progress", {
      section: "bedtime_stories",
      content_type: "bedtime_story",
      content_id: story.slug || story.id,
      content_slug: story.slug || story.id,
      content_title: story.title,
      language: lang,
      completion_percent: Math.round(((pageIndex + 1) / pageCount) * 100),
      step_index: pageIndex + 1,
      total_steps: pageCount,
    });
  }, [lang, pageCount, pageIndex, story.id, story.slug, story.title]);

  return (
    <div className="bedtime-reader-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bedtime-reader"
        role="dialog"
        aria-modal="true"
        aria-label={story.title}
        dir={isRtl ? "rtl" : "ltr"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="bedtime-reader-header">
          <h2>{story.title}</h2>
          <button className="bedtime-reader-close" type="button" onClick={onClose} aria-label={ui.close} title={ui.close}>
            ×
          </button>
        </header>

        <div className="bedtime-reader-page" aria-busy={isPageLoading}>
          {isPageLoading ? <span className="bedtime-reader-page-loader" aria-hidden="true" /> : null}
          <Image
            src={story.pageUrls[pageIndex]}
            alt={`${story.title}: ${counter}`}
            fill
            sizes="(max-width: 767px) 100vw, 72vw"
            priority
            unoptimized
            onLoad={() => setIsPageLoading(false)}
          />
        </div>

        <footer className="bedtime-reader-controls">
          <button
            type="button"
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            disabled={pageIndex === 0}
            aria-label={ui.previous}
            title={ui.previous}
          >
            {isRtl ? "→" : "←"}
          </button>
          <span aria-live="polite">{counter}</span>
          <button
            type="button"
            onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
            disabled={pageIndex === pageCount - 1}
            aria-label={ui.next}
            title={ui.next}
          >
            {isRtl ? "←" : "→"}
          </button>
        </footer>
      </section>
    </div>
  );
}
