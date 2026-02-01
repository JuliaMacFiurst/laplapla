import { dictionaries, type Lang } from "../../i18n";
import type { VideoItem } from "../../content/videos";

type VideosRowProps = {
  lang: Lang;
  items: VideoItem[];
  onSelectVideo: (id: string) => void;
};

export function VideosRow({ lang, items, onSelectVideo }: VideosRowProps) {
  const t = dictionaries[lang].video;

  const videos = items.filter((item) => {
    if (item.format !== "video") return false;

    // visual — язык не важен, показываем всегда
    if (item.languageDependency === "visual") {
      return true;
    }

    // spoken — показываем только если язык поддерживается
    return Array.isArray(item.contentLanguages) && item.contentLanguages.includes(lang);
  });

  if (!videos.length) {
    return (
      <div className="videos-row-empty">
        {t.subtitle ?? ""}
      </div>
    );
  }

  return (
    <div className="videos-row">
      {videos.map((item) => {
        // Жёсткий guard: если у видео нет youtubeId — карточку не показываем
        const youtubeId = item.youtubeId;

        if (!youtubeId) {
          return null;
        }

        const thumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

        return (
          <button
            key={item.id}
            className="video-card"
            onClick={() => onSelectVideo(item.youtubeId)}
            aria-label={t.videosTitle}
          >
            <div className="video-thumbnail">
              <img src={thumbnail} alt="" loading="lazy" />
              <span className="video-play-icon">▶</span>
            </div>

            <div className="video-info">
              <div className="video-title">
                {item.title?.[lang] ?? item.title?.en ?? item.id}
              </div>

              {item.durationLabel && (
                <div className="video-meta">
                  {item.durationLabel}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}