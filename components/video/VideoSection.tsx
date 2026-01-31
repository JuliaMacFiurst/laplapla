import { useEffect, useState } from "react";
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

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // выбранный плейлист для overlay-плеера: items + стартовый индекс + тип (short/video)
  const [activePlaylist, setActivePlaylist] = useState<{
    items: VideoItem[];
    startIndex: number;
    variant: "short" | "video";
  } | null>(null);

  const openShort = (id: string) => {
    const items = filteredShorts;
    const startIndex = items.findIndex((v) => v.id === id);
    setActivePlaylist({ items, startIndex, variant: "short" });
  };

  const openVideo = (id: string) => {
    const items = filteredVideos;
    const startIndex = items.findIndex((v) => v.id === id);
    setActivePlaylist({ items, startIndex, variant: "video" });
  };

  const closePlayer = () => setActivePlaylist(null);

  // активная категория для фильтрации (null = все)
  const [activeCategoryKey, setActiveCategoryKey] =
    useState<VideoCategoryKey | null>(null);

  const filteredShorts = allVideos.filter(
    (v) =>
      v.format === "short" &&
      (!activeCategoryKey || v.categoryKey === activeCategoryKey)
  );

  const filteredVideos = allVideos.filter(
    (v) =>
      v.format === "video" &&
      (!activeCategoryKey || v.categoryKey === activeCategoryKey)
  );

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
        <VideoSearch lang={lang} />
        <VideoCategories
          lang={lang}
          activeCategoryKey={activeCategoryKey}
          onSelectCategory={setActiveCategoryKey}
        />
      </div>

      {/* Встроенный просмотр видео (без рекомендаций) */}
      {activePlaylist && (
        <VideoPlayer
          items={activePlaylist.items}
          startIndex={activePlaylist.startIndex}
          variant={activePlaylist.variant}
          lang={lang}
          onClose={closePlayer}
        />
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