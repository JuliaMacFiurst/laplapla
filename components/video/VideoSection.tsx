import { useState } from "react";
import { VideoSearch } from "./VideoSearch";
import { VideoCategories } from "./VideoCategories";
import { ShortsRow } from "./ShortsRow";
import { VideosRow } from "./VideosRow";
import { dictionaries, Lang } from "../../i18n";

// ⚠️ ВАЖНО: импорт ТОЛЬКО через index.ts видеомодуля
import {
  videos,
  shorts,
  VideoItem,
  LongVideoItem,
  VideoCategoryKey,
} from "../../content/videos";
import { VideoPlayer } from "./VideoPlayer";

type AnyVideo = VideoItem | LongVideoItem;

export function VideoSection({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].video;

  // выбранное видео для overlay-плеера: id + тип (short/video)
  const [activeSelection, setActiveSelection] = useState<{
    id: string;
    kind: "short" | "video";
  } | null>(null);

  const openShort = (id: string) => setActiveSelection({ id, kind: "short" });
  const openVideo = (id: string) => {
  console.log("[VideoSection] openVideo called with id:", id);
  setActiveSelection({ id, kind: "video" });
};
  const closePlayer = () => setActiveSelection(null);

  // активная категория для фильтрации (null = все)
  const [activeCategoryKey, setActiveCategoryKey] =
    useState<VideoCategoryKey | null>(null);

  // объединённый whitelist всех разрешённых видео
  const allVideos: AnyVideo[] = [...shorts, ...videos];

  // ищем видео ТОЛЬКО в whitelist
 const activeVideo = activeSelection
  ? allVideos.find((v) => v.id === activeSelection.id)
  : null;

console.log("[VideoSection] activeSelection:", activeSelection);
console.log(
  "[VideoSection] activeVideo found:",
  activeVideo ? activeVideo.id : null
);

  const filteredShorts = activeCategoryKey
    ? shorts.filter((s) => s.categoryKey === activeCategoryKey)
    : shorts;

  const filteredVideos = activeCategoryKey
    ? videos.filter((v) => v.categoryKey === activeCategoryKey)
    : videos;

    {console.log(
  "[VideoSection] render VideoPlayer?",
  Boolean(activeVideo && activeSelection)
)}

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
      {activeVideo && activeSelection && (
        <VideoPlayer
          youtubeId={activeVideo.youtubeIds[lang] ?? activeVideo.youtubeIds.en}
          variant={activeSelection.kind}
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