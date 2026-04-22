import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeSearchQuery } from "../../utils/normalizeSearchQuery";
import { VideoSearch } from "./VideoSearch";
import { VideoCategories } from "./VideoCategories";
import { ShortsRow } from "./ShortsRow";
import { VideosRow } from "./VideosRow";
import { dictionaries, Lang } from "../../i18n";
import { devWarn } from "@/utils/devLog";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileVideoViewer, { type VideoItem as MobileViewerVideoItem } from "./MobileVideoViewer";

import type { VideoCategoryKey, VideoItem } from "../../content/videos";
import { VideoPlayer } from "./VideoPlayer";

const MOBILE_VIDEO_CARD_COLORS = ["pink", "lilac", "mint", "peach", "sky", "lemon"] as const;

type MobileMode = "shorts" | "videos";

function shuffleItems<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }

  return next;
}

function isPlayableForLang(item: VideoItem, lang: Lang) {
  if (!item.youtubeId) return false;
  if (item.languageDependency === "visual") return true;
  return Array.isArray(item.contentLanguages) && item.contentLanguages.includes(lang);
}

function toMobileViewerVideo(item: VideoItem, lang: Lang): MobileViewerVideoItem {
  const title = item.title?.[lang] ?? item.title?.en ?? item.id;

  return {
    id: item.id,
    title,
    description: item.durationLabel,
    videoUrl: `https://www.youtube-nocookie.com/embed/${item.youtubeId}`,
  };
}

export function VideoSection({
  lang,
  mobileMode,
}: {
  lang: Lang;
  mobileMode?: MobileMode;
}) {
  const t = dictionaries[lang].video;
  const isMobile = useIsMobile(767);

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shuffledIds, setShuffledIds] = useState<string[]>([]);
  const [activeMobileVideoIndex, setActiveMobileVideoIndex] = useState<number | null>(null);

  const loadingRef = useRef(false);

  const [activeCategoryKey, setActiveCategoryKey] = useState<VideoCategoryKey | null>(null);

  const [activePlaylist, setActivePlaylist] = useState<{
    items: VideoItem[];
    startIndex: number;
    variant: "short" | "video";
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function fetchVideos(query: string) {
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      setLoading(true);

      try {
        const url = query
          ? `/api/get-videos?lang=${lang}&q=${encodeURIComponent(query)}`
          : `/api/get-videos?lang=${lang}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!cancelled) {
          setAllVideos(data);
          setShuffledIds(shuffleItems(data.map((item: VideoItem) => item.id)));
        }
      } catch (e) {
        console.error(
          query ? "[VideoSection] failed to search videos" : "[VideoSection] failed to load videos",
          e
        );
      } finally {
        loadingRef.current = false;
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const normalizedQuery = normalizeSearchQuery(searchQuery);

    if (!normalizedQuery) {
      void fetchVideos("");
    } else {
      timeoutId = setTimeout(() => {
        void fetchVideos(normalizedQuery);
      }, 400);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchQuery, lang]);

  const shuffledOrder = useMemo(
    () => new Map(shuffledIds.map((id, index) => [id, index])),
    [shuffledIds]
  );

  const filteredShorts = useMemo(() => {
    const base = allVideos.filter(
      (item) =>
        item.format === "short" &&
        isPlayableForLang(item, lang) &&
        (searchQuery.trim() === "" || true) &&
        (!activeCategoryKey || item.categoryKey === activeCategoryKey)
    );

    const normalized = normalizeSearchQuery(searchQuery);
    const searched = !normalized
      ? base
      : base.filter((item) => {
          const localizedTitle = item.title?.[lang] ?? item.title?.en ?? item.id;
          return normalizeSearchQuery(localizedTitle).includes(normalized);
        });

    return [...searched].sort(
      (left, right) =>
        (shuffledOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (shuffledOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [activeCategoryKey, allVideos, lang, searchQuery, shuffledOrder]);

  const filteredVideos = useMemo(() => {
    const base = allVideos.filter(
      (item) =>
        item.format === "video" &&
        isPlayableForLang(item, lang) &&
        (!activeCategoryKey || item.categoryKey === activeCategoryKey)
    );

    const normalized = normalizeSearchQuery(searchQuery);
    const searched = !normalized
      ? base
      : base.filter((item) => {
          const localizedTitle = item.title?.[lang] ?? item.title?.en ?? item.id;
          return normalizeSearchQuery(localizedTitle).includes(normalized);
        });

    return [...searched].sort(
      (left, right) =>
        (shuffledOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (shuffledOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [activeCategoryKey, allVideos, lang, searchQuery, shuffledOrder]);

  const mobileStripItems = mobileMode === "videos" ? filteredVideos : filteredShorts;

  const mobileViewerVideos = useMemo(
    () => mobileStripItems.map((item) => toMobileViewerVideo(item, lang)),
    [lang, mobileStripItems]
  );

  useEffect(() => {
    if (
      activeMobileVideoIndex !== null &&
      (mobileViewerVideos.length === 0 || activeMobileVideoIndex > mobileViewerVideos.length - 1)
    ) {
      setActiveMobileVideoIndex(null);
    }
  }, [activeMobileVideoIndex, mobileViewerVideos.length]);

  const openShort = (youtubeId: string) => {
    const startIndex = filteredShorts.findIndex((video) => video.youtubeId === youtubeId);

    if (startIndex < 0) {
      devWarn("[VideoSection] openShort: youtubeId not found in filteredShorts", {
        youtubeId,
        available: filteredShorts.map((item) => item.youtubeId),
      });
      return;
    }

    setActivePlaylist({
      items: filteredShorts,
      startIndex,
      variant: "short",
    });
  };

  const openVideo = (youtubeId: string) => {
    const startIndex = filteredVideos.findIndex((video) => video.youtubeId === youtubeId);

    if (startIndex < 0) {
      devWarn("[VideoSection] openVideo: youtubeId not found in filteredVideos", {
        youtubeId,
        available: filteredVideos.map((item) => item.youtubeId),
      });
      return;
    }

    setActivePlaylist({
      items: filteredVideos,
      startIndex,
      variant: "video",
    });
  };

  const closePlayer = () => setActivePlaylist(null);

  if (loading) {
    return <div className="video-section">{t.mobileSectionTitle ?? "Loading…"}</div>;
  }

  if (isMobile && mobileMode) {
    const title = mobileMode === "videos" ? t.videosTitle : t.shortsTitle;
    const subtitle = mobileMode === "videos" ? t.mobilePopularTitle : t.mobileSectionSubtitle;

    return (
      <section className={`video-section video-section-mobile video-section-mobile-${mobileMode}`}>
        <div className="video-section-header video-section-header-mobile">
          <h2 className="page-title">{title}</h2>
          <p className="page-subtitle">{subtitle}</p>
        </div>

        {mobileMode === "shorts" ? (
          <div className="video-section-controls video-section-controls-mobile">
            <VideoSearch lang={lang} query={searchQuery} onChange={setSearchQuery} />
            <div className="video-categories-mobile-scroll">
              <VideoCategories
                lang={lang}
                activeCategoryKey={activeCategoryKey}
                onSelectCategory={setActiveCategoryKey}
              />
            </div>
          </div>
        ) : null}

        <div className="video-section-mobile-list-block">
          {mobileStripItems.length ? (
            <div
              className={
                mobileMode === "videos"
                  ? "mobile-video-vertical-list"
                  : "mobile-shorts-horizontal-strip"
              }
            >
              {mobileStripItems.map((item, index) => {
                const color = MOBILE_VIDEO_CARD_COLORS[index % MOBILE_VIDEO_CARD_COLORS.length];
                const titleText = item.title?.[lang] ?? item.title?.en ?? item.id;
                const thumbnail = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={mobileMode === "videos" ? `mobile-video-card ${color}` : `mobile-short-reel ${color}`}
                    onClick={() => setActiveMobileVideoIndex(index)}
                    aria-label={titleText}
                  >
                    <div
                      className={
                        mobileMode === "videos" ? "mobile-video-card-thumb" : "mobile-short-reel-thumb"
                      }
                    >
                      <img src={thumbnail} alt={titleText} loading="lazy" />
                      <span
                        className={
                          mobileMode === "videos" ? "mobile-video-card-play" : "mobile-short-reel-play"
                        }
                      >
                        ▶
                      </span>
                    </div>
                    <div
                      className={mobileMode === "videos" ? "mobile-video-card-body" : "mobile-short-reel-body"}
                    >
                      <div
                        className={
                          mobileMode === "videos" ? "mobile-video-card-title" : "mobile-short-reel-title"
                        }
                      >
                        {titleText}
                      </div>
                      {item.durationLabel ? (
                        <div
                          className={
                            mobileMode === "videos" ? "mobile-video-card-meta" : "mobile-short-reel-meta"
                          }
                        >
                          {item.durationLabel}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="video-empty-state">{t.emptyShorts}</div>
          )}
        </div>

        {activeMobileVideoIndex !== null ? (
          <MobileVideoViewer
            videos={mobileViewerVideos}
            initialIndex={activeMobileVideoIndex}
            onClose={() => setActiveMobileVideoIndex(null)}
            closeLabel={t.closeViewer}
            hintLabel={t.mobileViewerHint}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="video-section">
      <div className="video-section-header">
        <h2 className="page-title">{t.title}</h2>
        <p className="page-subtitle">{t.subtitle}</p>
      </div>

      <div className="video-section-controls">
        <VideoSearch lang={lang} query={searchQuery} onChange={setSearchQuery} />
        <VideoCategories
          lang={lang}
          activeCategoryKey={activeCategoryKey}
          onSelectCategory={setActiveCategoryKey}
        />
      </div>

      {activePlaylist ? (
        <VideoPlayer
          key={`${activePlaylist.variant}-${activePlaylist.startIndex}`}
          items={activePlaylist.items}
          startIndex={activePlaylist.startIndex}
          variant={activePlaylist.variant}
          lang={lang}
          onClose={closePlayer}
        />
      ) : null}

      {searchQuery.trim() !== "" && filteredShorts.length === 0 && filteredVideos.length === 0 ? (
        <div className="video-empty-state">Ничего не найдено</div>
      ) : null}

      <div className="video-section-block">
        <h3 className="video-block-title">{t.shortsTitle}</h3>
        <ShortsRow lang={lang} items={filteredShorts} onSelectVideo={openShort} />
      </div>

      <div className="video-section-block">
        <h3 className="video-block-title">{t.videosTitle}</h3>
        <VideosRow lang={lang} items={filteredVideos} onSelectVideo={openVideo} />
      </div>
    </section>
  );
}
