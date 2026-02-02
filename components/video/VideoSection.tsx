import { useEffect, useState } from "react";
import { normalizeSearchQuery } from "../../utils/normalizeSearchQuery";
import { VideoSearch } from "./VideoSearch";
import { VideoCategories } from "./VideoCategories";
import { ShortsRow } from "./ShortsRow";
import { VideosRow } from "./VideosRow";
import { dictionaries, Lang } from "../../i18n";

// ⚠️ ВАЖНО: импорт ТОЛЬКО через index.ts видеомодуля
import type { VideoCategoryKey, VideoItem } from "../../content/videos";
import { VideoPlayer } from "./VideoPlayer";

export function VideoSection({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].video;

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

    async function loadVideos() {
      setLoading(true);
      try {
        const res = await fetch(`/api/get-videos?lang=${lang}`);
        const data = await res.json();
        if (!cancelled) {
          setAllVideos(data);
        }
      } catch (e) {
        console.error("[VideoSection] failed to load videos", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVideos();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    async function fetchVideos(query: string) {
      try {
        const res = await fetch(
          `/api/get-videos?lang=${lang}&q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setAllVideos(data);
        }
      } catch (e) {
        console.error("[VideoSection] failed to search videos", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (searchQuery.trim() === "") {
      // if empty query, reload default videos
      setLoading(true);
      fetch(`/api/get-videos?lang=${lang}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            setAllVideos(data);
          }
        })
        .catch((e) => {
          console.error("[VideoSection] failed to load videos", e);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      timeoutId = setTimeout(() => {
        const normalized = normalizeSearchQuery(searchQuery);
        fetchVideos(normalized);
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
      console.warn(
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
      console.warn(
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
