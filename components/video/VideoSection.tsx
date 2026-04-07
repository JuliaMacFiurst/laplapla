import { useEffect, useRef, useState } from "react";
import { normalizeSearchQuery } from "../../utils/normalizeSearchQuery";
import { VideoSearch } from "./VideoSearch";
import { VideoCategories } from "./VideoCategories";
import { ShortsRow } from "./ShortsRow";
import { VideosRow } from "./VideosRow";
import { dictionaries, Lang } from "../../i18n";
import { devWarn } from "@/utils/devLog";

// ⚠️ ВАЖНО: импорт ТОЛЬКО через index.ts видеомодуля
import type { VideoCategoryKey, VideoItem } from "../../content/videos";
import { VideoPlayer } from "./VideoPlayer";

export function VideoSection({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].video;

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const loadingRef = useRef(false);

  // активная категория для фильтрации (null = все)
  const [activeCategoryKey, setActiveCategoryKey] =
    useState<VideoCategoryKey | null>(null);

  const filteredShorts = allVideos.filter(
    (v) =>
      v.format === "short" &&
      (searchQuery.trim() !== "" ||
        !activeCategoryKey ||
        v.categoryKey === activeCategoryKey),
  );

  const filteredVideos = allVideos.filter(
    (v) =>
      v.format === "video" &&
      (searchQuery.trim() !== "" ||
        !activeCategoryKey ||
        v.categoryKey === activeCategoryKey),
  );

  // выбранный плейлист для overlay-плеера: items + стартовый индекс + тип (short/video)
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
        }
      } catch (e) {
        console.error(
          query ? "[VideoSection] failed to search videos" : "[VideoSection] failed to load videos",
          e,
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

  // ✅ Единственный источник истины: YouTube embed id (youtubeId)
  const openShort = (youtubeId: string) => {
    const items = filteredShorts;
    const startIndex = items.findIndex((v) => v.youtubeId === youtubeId);
    // If we can't find it, don't silently fall back to 0 (it looks like “always plays first”).
    if (startIndex < 0) {
      devWarn(
        "[VideoSection] openShort: youtubeId not found in filteredShorts",
        {
          youtubeId,
          available: items.map((x) => x.youtubeId),
        },
      );

      return;
    }

    setActivePlaylist({
      items,
      startIndex,
      variant: "short",
    });
  };

  const openVideo = (youtubeId: string) => {
    const items = filteredVideos;
    const startIndex = items.findIndex((v) => v.youtubeId === youtubeId);

    if (startIndex < 0) {
      devWarn(
        "[VideoSection] openVideo: youtubeId not found in filteredVideos",
        {
          youtubeId,
          available: items.map((x) => x.youtubeId),
        },
      );
      return;
    }

    setActivePlaylist({
      items,
      startIndex,
      variant: "video",
    });
  };

  const closePlayer = () => setActivePlaylist(null);

  if (loading) {
    return <div className="video-section">Загрузка…</div>;
  }

  return (
    <section className="video-section">
      {/* Заголовок */}
      <div className="video-section-header">
        <h2 className="page-title">{t.title}</h2>
        <p className="page-subtitle">{t.subtitle}</p>
      </div>

      {/* Поиск и категории */}
      <div className="video-section-controls">
        <VideoSearch
          lang={lang}
          query={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
          }}
        />
        <VideoCategories
          lang={lang}
          activeCategoryKey={activeCategoryKey}
          onSelectCategory={setActiveCategoryKey}
        />
      </div>

      {/* Встроенный просмотр видео (без рекомендаций) */}
      {activePlaylist && (
        <VideoPlayer
          key={`${activePlaylist.variant}-${activePlaylist.startIndex}`}
          items={activePlaylist.items}
          startIndex={activePlaylist.startIndex}
          variant={activePlaylist.variant}
          lang={lang}
          onClose={closePlayer}
        />
      )}

      {searchQuery.trim() !== "" &&
        filteredShorts.length === 0 &&
        filteredVideos.length === 0 && (
          <div className="video-empty-state">
            Ничего не найдено
          </div>
        )}

      {/* Shorts */}
      <div className="video-section-block">
        <h3 className="video-block-title">{t.shortsTitle}</h3>
        <ShortsRow
          lang={lang}
          items={filteredShorts}
          onSelectVideo={openShort}
        />
      </div>

      {/* Обычные видео */}
      <div className="video-section-block">
        <h3 className="video-block-title">{t.videosTitle}</h3>
        <VideosRow
          lang={lang}
          items={filteredVideos}
          onSelectVideo={openVideo}
        />
      </div>
    </section>
  );
}
