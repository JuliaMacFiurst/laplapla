import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import SEO from "@/components/SEO";
import { dictionaries, type Lang } from "@/i18n";
import { trackEvent } from "@/lib/analytics/client";
import { BASE_URL } from "@/lib/config";
import { buildCanonicalUrl, buildLocalizedPublicPath } from "@/lib/i18n/routing";
import type { LibraryContentType, LibraryItem } from "@/lib/library";

type Props = {
  lang: Lang;
  items: LibraryItem[];
  selectedItem?: LibraryItem | null;
};

export function buildLibraryItemPath(slug: string) {
  return `/library/${slug}`;
}

function contentTypeLabel(type: LibraryContentType, ui: typeof dictionaries.en.library) {
  return ui[type];
}

function LibraryCard({ item, lang, priority = false }: { item: LibraryItem; lang: Lang; priority?: boolean }) {
  const ui = dictionaries[lang].library;
  return (
    <article className={`library-card library-card--${item.contentType}`}>
      <Link href={buildLocalizedPublicPath(buildLibraryItemPath(item.slug), lang)}>
        <span className="library-card-media">
          <Image
            src={item.previewUrl}
            alt=""
            fill
            sizes="(max-width: 720px) 88vw, (max-width: 1100px) 44vw, 360px"
            priority={priority}
            unoptimized
          />
          <span className="library-card-type">{contentTypeLabel(item.contentType, ui)}</span>
          {item.contentType === "video" ? <span className="library-card-play" aria-hidden="true">▶</span> : null}
        </span>
        <span className="library-card-copy">
          <strong>{item.title}</strong>
          <span>{item.description}</span>
          <em>{ui.openItem} →</em>
        </span>
      </Link>
    </article>
  );
}

function LibraryViewer({ item, lang }: { item: LibraryItem; lang: Lang }) {
  const ui = dictionaries[lang].library;
  const [pageIndex, setPageIndex] = useState(0);
  const openedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    trackEvent("content_open", {
      section: "library",
      content_type: item.contentType,
      content_id: item.id,
      content_slug: item.slug,
      content_title: item.title,
      language: lang,
      source_page: typeof document === "undefined" ? null : document.referrer || null,
      total_steps: item.contentType === "slideshow" ? item.pageUrls.length : 1,
    });
  }, [item, lang]);

  const trackCompletion = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    trackEvent("content_complete", {
      section: "library",
      content_type: item.contentType,
      content_id: item.id,
      content_slug: item.slug,
      content_title: item.title,
      language: lang,
      completion_percent: 100,
      total_steps: item.contentType === "slideshow" ? item.pageUrls.length : 1,
    });
  };

  useEffect(() => {
    if (item.contentType === "slideshow" && pageIndex === item.pageUrls.length - 1) trackCompletion();
  });

  const counter = ui.counter
    .replace("{current}", String(pageIndex + 1))
    .replace("{total}", String(item.pageUrls.length));

  return (
    <section className="library-detail" aria-labelledby="library-item-title">
      <div className={`library-detail-player library-detail-player--${item.contentType}`}>
        {item.contentType === "video" && item.mediaUrl ? (
          <video
            src={item.mediaUrl}
            poster={item.previewUrl}
            controls
            playsInline
            preload="metadata"
            onEnded={trackCompletion}
          />
        ) : item.contentType === "image" && item.mediaUrl ? (
          <Image src={item.mediaUrl} alt={item.title} fill sizes="(max-width: 800px) 100vw, 760px" priority unoptimized />
        ) : (
          <>
            <Image src={item.pageUrls[pageIndex]} alt={`${item.title}: ${counter}`} fill sizes="(max-width: 800px) 100vw, 760px" priority unoptimized />
            <div className="library-slideshow-controls">
              <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => Math.max(0, value - 1))} aria-label={ui.previous}>
                {lang === "he" ? "→" : "←"}
              </button>
              <span aria-live="polite">{counter}</span>
              <button type="button" disabled={pageIndex === item.pageUrls.length - 1} onClick={() => setPageIndex((value) => Math.min(item.pageUrls.length - 1, value + 1))} aria-label={ui.next}>
                {lang === "he" ? "←" : "→"}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="library-detail-copy">
        <span className="library-detail-type">{contentTypeLabel(item.contentType, ui)}</span>
        <h1 id="library-item-title">{item.title}</h1>
        <p>{item.description}</p>
        {item.categories.length ? (
          <ul className="library-category-list" aria-label={ui.browseLabel}>
            {item.categories.map((category) => <li key={category.slug}>{category.label}</li>)}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export default function LibraryExperience({ lang, items, selectedItem = null }: Props) {
  const ui = dictionaries[lang].library;
  const seo = dictionaries[lang].seo.library;
  const path = selectedItem ? buildLibraryItemPath(selectedItem.slug) : "/library";
  const related = selectedItem ? items.filter((item) => item.id !== selectedItem.id).slice(0, 3) : [];
  const schemaType = selectedItem?.contentType === "video" ? "VideoObject" : selectedItem?.contentType === "image" ? "ImageObject" : "Article";
  const jsonLd = selectedItem ? {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: selectedItem.title,
    headline: selectedItem.title,
    description: selectedItem.description,
    thumbnailUrl: selectedItem.previewUrl,
    contentUrl: selectedItem.mediaUrl || undefined,
    image: selectedItem.previewUrl,
    url: buildCanonicalUrl(BASE_URL, path, lang),
    inLanguage: lang,
  } : undefined;

  return (
    <>
      <SEO
        title={selectedItem ? `${selectedItem.title} — LapLapLa` : seo.title}
        description={selectedItem?.description || seo.description}
        path={path}
        lang={lang}
        type={selectedItem?.contentType === "video" ? "video.other" : selectedItem ? "article" : "website"}
        image={selectedItem?.previewUrl}
        jsonLd={jsonLd}
      />
      <main className="library-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <nav className="library-top-nav">
          <Link href={buildLocalizedPublicPath(selectedItem ? "/library" : "/", lang)}>
            {selectedItem ? ui.backLibrary : ui.backHome}
          </Link>
          <span aria-label="LapLapLa">LAPLAPLA</span>
        </nav>

        {selectedItem ? (
          <>
            <LibraryViewer item={selectedItem} lang={lang} />
            <section className="library-next-steps" aria-labelledby="library-next-title">
              <h2 id="library-next-title">{ui.discoverNext}</h2>
              <div>
                <Link href={buildLocalizedPublicPath("/cats/studio", lang)}>{ui.makeSomething}</Link>
                <Link href={buildLocalizedPublicPath("/raccoons", lang)}>{ui.discover}</Link>
                <Link href={buildLocalizedPublicPath("/library", lang)}>{ui.watchAnother}</Link>
                <Link href={buildLocalizedPublicPath("/", lang)}>{ui.homeExperience}</Link>
              </div>
            </section>
            {related.length ? (
              <section className="library-related" aria-labelledby="library-related-title">
                <h2 id="library-related-title">{ui.exploreMore}</h2>
                <div className="library-grid">{related.map((item) => <LibraryCard key={item.id} item={item} lang={lang} />)}</div>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <header className="library-hero">
              <div>
                <p>{ui.kicker}</p>
                <h1>{ui.title}</h1>
                <div>{ui.subtitle}</div>
              </div>
              {items[0] ? (
                <Link className="library-hero-feature" href={buildLocalizedPublicPath(buildLibraryItemPath(items[0].slug), lang)}>
                  <Image src={items[0].previewUrl} alt="" fill sizes="(max-width: 720px) 92vw, 480px" priority unoptimized />
                  <span>{contentTypeLabel(items[0].contentType, ui)} · {items[0].title}</span>
                </Link>
              ) : null}
            </header>
            <div className="library-controls-slot" data-library-controls-slot="search-and-categories" />
            <section className="library-collection" aria-labelledby="library-collection-title">
              <h2 id="library-collection-title">{ui.browseLabel}</h2>
              {items.length ? <div className="library-grid">{items.map((item, index) => <LibraryCard key={item.id} item={item} lang={lang} priority={index < 2} />)}</div> : <p>{ui.empty}</p>}
            </section>
          </>
        )}
      </main>
    </>
  );
}
