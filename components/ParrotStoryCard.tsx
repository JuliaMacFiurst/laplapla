import * as React from "react";
import { buildAnimalSlideMediaQueries, findAlternativeSlideMedia } from "@/lib/client/slideMediaSearch";

type Props = {
  lang: "ru" | "en" | "he";
  styleSlug: string;
  title: string;
  description: string;
  searchArtist: string;
  searchGenre: string;
  slides: Slide[];
  ui: {
    externalPrompt: string;
    aboutArtist: string;
    aboutStyle: string;
    openSlideshowWithMusic: string;
    findNewImage: string;
  };
  onResolvedSlidesChange?: (slides: Slide[]) => void;
  onOpenStudio?: () => void;
};

export type Slide = {
  text: string;
  mediaUrl?: string;
  mediaType?: "gif" | "image" | "video";
};

const openGoogle = (q: string) =>
  window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");

type MediaType = "gif" | "image" | "video";

type MediaItem = {
  url: string;
  mediaType: MediaType;
};

type MediaResponse = {
  items: MediaItem[];
  query: string;
  cached: boolean;
};

type ClientCacheEntry = {
  media: MediaItem | null;
  timestamp: number;
};

const clientMediaCache = new Map<string, ClientCacheEntry>();
const CLIENT_TTL_MS = 60 * 60 * 1000;
const SESSION_STORAGE_KEY = "parrot-story-media-cache-v1";
const PLACEHOLDER_MEDIA: MediaItem = {
  url: "/images/parrot.webp",
  mediaType: "image",
};
const PARROT_SEARCH_HINTS = ["parrot", "cute parrot", "funny parrot"];

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into",
  "это", "как", "что", "для", "или", "его", "она", "они", "про",
  "עם", "של", "זה", "את", "על", "גם", "אבל", "כמו",
  "music", "style", "sound", "song", "genre",
  "музыка", "стиль", "звук", "песня", "жанр",
  "מוזיקה", "סגנון", "צליל", "שיר",
]);

const STYLE_HINTS: Record<string, string[]> = {
  lofi: ["lofi", "chill", "vinyl", "music", "study"],
  bossa: ["bossa", "nova", "brazil", "guitar", "jazz"],
  synthwave: ["synthwave", "retro", "neon", "night", "synth"],
  funk: ["funk", "groove", "bass", "dance", "rhythm"],
  house: ["house", "dance", "club", "beat", "dj"],
  reggae: ["reggae", "dub", "groove", "island", "sunny"],
  ambient: ["ambient", "calm", "space", "dreamy", "soft"],
  jazzhop: ["jazzhop", "jazz", "beats", "lofi", "study"],
  chiptune: ["chiptune", "8bit", "arcade", "pixel", "game"],
  kpop: ["kpop", "dance", "stage", "pop", "show"],
  afroperc: ["afro", "percussion", "drums", "rhythm", "festival"],
  celtic: ["celtic", "folk", "flute", "violin", "legend"],
  latin: ["latin", "fiesta", "dance", "percussion", "summer"],
  cartoon: ["cartoon", "funny", "playful", "comic", "animation"],
  rock: ["rock", "guitar", "drums", "stage", "energy"],
  classic: ["classical", "orchestra", "concert", "piano", "symphony"],
  dance: ["dance", "party", "club", "beat", "energy"],
  spiritual: ["spiritual", "calm", "peace", "meditation", "light"],
};

const extractKeywords = (text: string, styleSlug: string) => {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const styleHints = STYLE_HINTS[styleSlug.trim().toLowerCase()] ?? [styleSlug.trim().toLowerCase()];
  const merged = [...styleHints, ...tokens];

  return merged.filter((word, index) => word && merged.indexOf(word) === index).slice(0, 5);
};

const getSpecialParrotQuery = (index: number, slideCount: number) => {
  const firstIndex = 0;
  const middleIndex = Math.floor(slideCount / 2);
  const lastIndex = slideCount - 1;

  if (index === firstIndex) return "parrot dancing";
  if (index === middleIndex) return "funny parrot";
  if (index === lastIndex) return "parrot dancing";
  return null;
};

const buildMediaQueries = (styleSlug: string, slideText: string) => {
  const keywords = extractKeywords(slideText, styleSlug);
  const style = styleSlug.trim().toLowerCase();
  return buildAnimalSlideMediaQueries(
    PARROT_SEARCH_HINTS,
    [style, ...keywords].filter(Boolean).join(" ").trim(),
    [style, ...keywords.slice(0, 3)].filter(Boolean).join(" ").trim(),
    [...keywords, style, "music"].filter(Boolean).join(" ").trim(),
  );
};

const isVideoUrl = (url: string) => /\.mp4(\?|$)|\.webm(\?|$)/i.test(url);

const getMediaTypeFromUrl = (url: string): MediaType =>
  isVideoUrl(url) ? "video" : /\.gif(\?|$)/i.test(url) ? "gif" : "image";

const loadSessionCache = () => {
  if (typeof window === "undefined") return;

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ClientCacheEntry>;

    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && Date.now() - entry.timestamp < CLIENT_TTL_MS) {
        clientMediaCache.set(key, entry);
      }
    }
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
};

const persistSessionCache = () => {
  if (typeof window === "undefined") return;

  try {
    const next: Record<string, ClientCacheEntry> = {};
    for (const [key, entry] of clientMediaCache.entries()) {
      if (Date.now() - entry.timestamp < CLIENT_TTL_MS) {
        next[key] = entry;
      }
    }
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota/storage issues; memory cache remains active.
  }
};

const getCachedMedia = (cacheKey: string) => {
  const cached = clientMediaCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp >= CLIENT_TTL_MS) {
    clientMediaCache.delete(cacheKey);
    return null;
  }
  return cached.media;
};

const logMediaDebug = (payload: {
  index: number;
  query: string;
  source: "giphy" | "pexels" | "placeholder";
  cacheHit: boolean;
  mediaUrl?: string;
}) => {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[ParrotStoryCard]", payload);
};

async function loadMediaItems(
  source: "giphy" | "pexels",
  query: string,
): Promise<{ items: MediaItem[]; cacheHit: boolean }> {
  const endpoint = source === "giphy" ? "/api/giphy" : "/api/pexels";
  const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&limit=8`);
  if (!response.ok) {
    return { items: [], cacheHit: false };
  }

  const json = (await response.json()) as Partial<MediaResponse>;
  const items = Array.isArray(json.items)
    ? json.items
        .map((item) =>
          item?.url
            ? {
                url: item.url,
                mediaType: item.mediaType ?? getMediaTypeFromUrl(item.url),
              }
            : null,
        )
        .filter(Boolean) as MediaItem[]
    : [];

  return { items, cacheHit: Boolean(json.cached) };
}

async function fetchMedia(
  styleSlug: string,
  slide: Slide,
  index: number,
  slideCount: number,
  usedMedia: Set<string>,
): Promise<MediaItem | null> {
  if (slide.mediaUrl) {
    return {
      url: slide.mediaUrl,
      mediaType: slide.mediaType ?? getMediaTypeFromUrl(slide.mediaUrl),
    };
  }

  const specialParrotQuery = getSpecialParrotQuery(index, slideCount);
  const source: "giphy" | "pexels" = specialParrotQuery ? "giphy" : index % 2 === 0 ? "giphy" : "pexels";
  const queries = specialParrotQuery ? [specialParrotQuery] : buildMediaQueries(styleSlug, slide.text);
  const cacheKey = `${styleSlug}:${index}:${source}:${queries.join("|")}`;
  const cachedMedia = getCachedMedia(cacheKey);

  if (cachedMedia && !usedMedia.has(cachedMedia.url)) {
    usedMedia.add(cachedMedia.url);
    logMediaDebug({ index, query: queries[0] ?? "", source, cacheHit: true, mediaUrl: cachedMedia.url });
    return cachedMedia;
  }

  let reusableMedia = cachedMedia;

  for (const query of queries) {
    const { items, cacheHit } = await loadMediaItems(source, query);
    const selected = items.find((item) => !usedMedia.has(item.url)) ?? items[0] ?? null;

    if (selected) {
      clientMediaCache.set(cacheKey, { media: selected, timestamp: Date.now() });
      persistSessionCache();
      usedMedia.add(selected.url);
      logMediaDebug({ index, query, source, cacheHit, mediaUrl: selected.url });
      return selected;
    }

    if (!reusableMedia && items[0]) {
      reusableMedia = items[0];
    }
  }

  if (reusableMedia) {
    clientMediaCache.set(cacheKey, { media: reusableMedia, timestamp: Date.now() });
    persistSessionCache();
    usedMedia.add(reusableMedia.url);
    logMediaDebug({
      index,
      query: queries[0] ?? "",
      source,
      cacheHit: true,
      mediaUrl: reusableMedia.url,
    });
    return reusableMedia;
  }

  logMediaDebug({
    index,
    query: queries[0] ?? "",
    source: "placeholder",
    cacheHit: false,
    mediaUrl: PLACEHOLDER_MEDIA.url,
  });
  return PLACEHOLDER_MEDIA;
}

const ParrotSlider = ({
  slides = [],
  isRtlText = false,
  currentIndex,
  onCurrentIndexChange,
  onFindNewImage,
  isFindingNewImage = false,
  findNewImageLabel,
}: {
  slides?: Slide[];
  isRtlText?: boolean;
  currentIndex: number;
  onCurrentIndexChange: (index: number) => void;
  onFindNewImage?: (index: number) => void | Promise<void>;
  isFindingNewImage?: boolean;
  findNewImageLabel: string;
}) => {
  const sliderRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const handleScroll = () => {
      const scrollLeft = slider.scrollLeft;
      const slideWidth = slider.offsetWidth * 0.9 + 16;
      const index = Math.round(scrollLeft / slideWidth);
      onCurrentIndexChange(index);
    };

    slider.addEventListener("scroll", handleScroll);
    return () => slider.removeEventListener("scroll", handleScroll);
  }, [onCurrentIndexChange]);

  React.useEffect(() => {
    onCurrentIndexChange(0);
    sliderRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [onCurrentIndexChange, slides]);

  const goToSlide = (index: number) => {
    onCurrentIndexChange(index);
    const slider = sliderRef.current;
    if (!slider) return;
    const slideWidth = slider.offsetWidth * 0.9 + 16;
    slider.scrollTo({ left: slideWidth * index, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={sliderRef}
        className="slider"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          gap: "16px",
          padding: "1rem 2rem",
          scrollPadding: "0 2rem",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            width: "5%",
            scrollSnapAlign: "start"
          }}
        />
        {slides?.map((slide, index) => (
          <div
            key={index}
            className={`slide${index === currentIndex ? " active" : ""}`}
            style={{
              flex: "0 0 auto",
              width: "90%",
              scrollSnapAlign: "center",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <div
              style={{
                width: "100%",
                maxHeight: "300px",
                display: "flex",
                justifyContent: "center"
              }}
            >
              {slide.mediaUrl ? (
                slide.mediaType === "video" || isVideoUrl(slide.mediaUrl) ? (
                <video
                  src={slide.mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain"
                  }}
                />
              ) : (
                <img
                  src={slide.mediaUrl}
                  alt={slide.text}
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain"
                  }}
                />
                )
              ) : (
                <div
                  style={{
                    width: "100%",
                    minHeight: "220px",
                    maxHeight: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "28px",
                    background: "linear-gradient(135deg, #fff3b0, #ffd6e7 55%, #d9f7ff)",
                    padding: "1.5rem",
                    boxSizing: "border-box",
                    fontFamily: "'Amatic SC', cursive",
                    fontSize: "42px",
                    color: "#3a2a2a"
                  }}
                >
                  🦜
                </div>
              )}
            </div>
            <div
              className="text-overlay"
              style={{
                marginTop: "0.5rem",
                fontSize: "26px",
                lineHeight: "1.4",
                minHeight: "60px",
                padding: "0 1rem",
                boxSizing: "border-box",
                width: "400px",
                direction: isRtlText ? "rtl" : "ltr",
                textAlign: isRtlText ? "right" : "center",
              }}
            >
              {slide.text}
            </div>
          </div>
        ))}
        <div
          style={{
            flex: "0 0 auto",
            width: "5%",
            scrollSnapAlign: "end"
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", maxWidth: "1000px", margin: "0 auto", marginTop: "-1rem" }}>
        <button
          onClick={() => sliderRef.current?.scrollBy({ left: -500, behavior: "smooth" })}
          disabled={currentIndex === 0}
          style={{
            fontFamily: "'Amatic SC', cursive",
            fontSize: "48px",
            color: currentIndex === 0 ? "#ccc" : "#333",
            background: "transparent",
            border: "none",
            cursor: currentIndex === 0 ? "default" : "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => {
            if (currentIndex > 0) e.currentTarget.style.color = "#666";
          }}
          onMouseOut={(e) => {
            if (currentIndex > 0) e.currentTarget.style.color = "#333";
          }}
        >
          ‹
        </button>
        <button
          onClick={() => sliderRef.current?.scrollBy({ left: 500, behavior: "smooth" })}
          disabled={currentIndex === slides.length - 1}
          style={{
            fontFamily: "'Amatic SC', cursive",
            fontSize: "48px",
            color: currentIndex === slides.length - 1 ? "#ccc" : "#333",
            background: "transparent",
            border: "none",
            cursor: currentIndex === slides.length - 1 ? "default" : "pointer",
            userSelect: "none",
            transition: "color 0.2s",
          }}
          onMouseOver={(e) => {
            if (currentIndex < slides.length - 1) e.currentTarget.style.color = "#666";
          }}
          onMouseOut={(e) => {
            if (currentIndex < slides.length - 1) e.currentTarget.style.color = "#333";
          }}
        >
          ›
        </button>
      </div>
      {onFindNewImage ? (
        <div className="slideshow-refresh-button-row" style={{ maxWidth: "1000px", margin: "0.75rem auto 0", padding: "0 2rem" }}>
          <button
            type="button"
            className="studio-button btn-mint map-popup-action-button slideshow-refresh-button"
            disabled={isFindingNewImage}
            onClick={() => void onFindNewImage(currentIndex)}
          >
            {isFindingNewImage ? "..." : findNewImageLabel}
          </button>
        </div>
      ) : null}
      <div className="nav-buttons">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`dot${index === currentIndex ? " active" : ""}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
};

export default function ParrotStoryCard({
  lang,
  styleSlug,
  title,
  description,
  searchArtist,
  searchGenre,
  slides,
  ui,
  onResolvedSlidesChange,
  onOpenStudio,
}: Props) {
  const [resolvedSlides, setResolvedSlides] = React.useState<Slide[]>(slides);
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
  const [refreshingSlideIndex, setRefreshingSlideIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadSessionCache();
    setResolvedSlides(slides);

    void (async () => {
      const usedMedia = new Set<string>(
        slides.map((slide) => slide.mediaUrl).filter(Boolean) as string[],
      );
      const nextSlides: Slide[] = [];

      for (let index = 0; index < slides.length; index += 1) {
        const slide = slides[index];
        const media = await fetchMedia(styleSlug, slide, index, slides.length, usedMedia);

        nextSlides.push({
          ...slide,
          mediaUrl: slide.mediaUrl ?? media?.url ?? undefined,
          mediaType:
            slide.mediaType ??
            (slide.mediaUrl ? getMediaTypeFromUrl(slide.mediaUrl) : media?.mediaType),
        });
      }

      if (!cancelled) {
        setResolvedSlides(nextSlides);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang, slides, styleSlug]);

  React.useEffect(() => {
    onResolvedSlidesChange?.(resolvedSlides);
  }, [onResolvedSlidesChange, resolvedSlides]);

  const handleFindNewImage = React.useCallback(async (slideIndex: number) => {
    const slide = resolvedSlides[slideIndex];
    if (!slide) {
      return;
    }

    setRefreshingSlideIndex(slideIndex);
    try {
      const alternative = await findAlternativeSlideMedia({
        queries: buildAnimalSlideMediaQueries(PARROT_SEARCH_HINTS, title, description, styleSlug, slide.text),
        excludedUrls: slide.mediaUrl ? [slide.mediaUrl] : [],
        preferredSources: ["giphy", "pexels"],
      });

      if (!alternative) {
        return;
      }

      setResolvedSlides((currentSlides) =>
        currentSlides.map((currentSlide, index) =>
          index === slideIndex
            ? {
                ...currentSlide,
                mediaUrl: alternative.url,
                mediaType: alternative.mediaType,
              }
            : currentSlide,
        ),
      );
    } finally {
      setRefreshingSlideIndex((current) => (current === slideIndex ? null : current));
    }
  }, [description, resolvedSlides, styleSlug, title]);

  return (
    <div className={`story-container story-card-root force-ltr-layout ${lang === "he" ? "text-rtl-scope" : ""}`}>
      <div className="story-content" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h3
          className="title story-card-text"
          style={{ fontSize: "32px", marginBottom: "1rem" }}
        >
          {title}
        </h3>
        <p
          className="subtitle story-card-text"
          style={{ fontSize: "20px", marginBottom: "1.5rem" }}
        >
          {description}
        </p>
        <div className="slider-container" style={{ position: "relative" }}>
          {(resolvedSlides?.length ?? 0) > 0 && (
            <ParrotSlider
              slides={resolvedSlides}
              isRtlText={lang === "he"}
              currentIndex={currentSlideIndex}
              onCurrentIndexChange={setCurrentSlideIndex}
              onFindNewImage={handleFindNewImage}
              isFindingNewImage={refreshingSlideIndex === currentSlideIndex}
              findNewImageLabel={ui.findNewImage}
            />
          )}
        </div>
        <div className="parrot-button-container">
          <h4
            className="story-card-text story-card-text-center"
            style={{ fontFamily: "'Amatic SC', cursive", fontSize: "22px", marginBottom: "0.5rem", textAlign: "center" }}
          >
            {ui.externalPrompt}
          </h4>
          <button
            onClick={() => openGoogle(searchArtist + " site:youtube.com")}
            className="external-link-button artist story-card-text"
          >
            {ui.aboutArtist}
          </button>
          <button
            onClick={() => openGoogle(searchGenre)}
            className="external-link-button genre story-card-text"
          >
            {ui.aboutStyle}
          </button>
          <button
            onClick={onOpenStudio}
            className="external-link-button studio story-card-text"
            type="button"
          >
            {ui.openSlideshowWithMusic}
          </button>
        </div>
      </div>
      <style jsx>{`
        .external-link-button {
          font-family: 'Amatic SC', cursive;
          font-size: 24px;
          padding: 0.6rem 1.4rem;
          margin: 0.5rem;
          border: 2px solid #ffd2ec;
          border-radius: 14px;
          /* background-color: #fff0f8; */
          color: #444;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          width: 260px;
          justify-content: center;
        }

        .external-link-button.artist {
          background-color: #e0f7ff;
          border-color: #b3e5fc;
        }

        .external-link-button.artist:hover {
          background-color: #d0f0ff;
          box-shadow: 0 0 12px rgba(255, 182, 193, 0.6), 0 0 20px rgba(255, 240, 245, 0.8);
          transform: scale(1.06) rotate(-1deg);
        }

        .external-link-button.genre {
          background-color: #e6ffe0;
          border-color: #b2f2a4;
        }

        .external-link-button.genre:hover {
          background-color: #dbffd2;
          box-shadow: 0 0 12px rgba(255, 182, 193, 0.6), 0 0 20px rgba(255, 240, 245, 0.8);
          transform: scale(1.06) rotate(-1deg);
        }

        .external-link-button.studio {
          background-color: #fff3d9;
          border-color: #ffd089;
        }

        .external-link-button.studio:hover {
          background-color: #ffe9bf;
          box-shadow: 0 0 12px rgba(255, 205, 120, 0.35), 0 0 20px rgba(255, 240, 210, 0.9);
          transform: scale(1.06) rotate(-1deg);
        }

        .external-link-button:hover {
          background-color: #ffeaf6;
          transform: scale(1.03);
          animation: wiggle 0.4s ease-in-out;
        }

        .external-link-button::after {
          content: '';
        }

        .parrot-button-container {
          background-color: #fff4fa; /* светлый персиково-розовый, можно заменить */
          padding: 1.5rem 1rem;
          border-radius: 40px;
          max-width: 360px;
          margin: 1.5rem auto 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 0 10px rgba(255, 204, 229, 0.3);
        }

        .story-card-root.force-ltr-layout,
        .story-card-root.force-ltr-layout .story-content,
        .story-card-root.force-ltr-layout .slider-container,
        .story-card-root.force-ltr-layout .parrot-button-container {
          direction: ltr;
        }

        .text-rtl-scope :global(.story-card-text) {
          direction: rtl;
          text-align: right;
        }

        .text-rtl-scope :global(.story-card-text-center) {
          text-align: center;
        }

        @keyframes wiggle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(2deg); }
          50% { transform: rotate(-2deg); }
          75% { transform: rotate(1deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
