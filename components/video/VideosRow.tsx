import { dictionaries, type Lang } from "../../i18n";
import { LongVideoItem } from "../../content/videos";

type VideosRowProps = {
  lang: Lang;
  items: LongVideoItem[];
  onSelectVideo: (id: string) => void;
};

export function VideosRow({ lang, items, onSelectVideo }: VideosRowProps) {
  const t = dictionaries[lang].video;

  if (!items.length) {
    return (
      <div className="videos-row-empty">
        {t.subtitle ?? ""}
      </div>
    );
  }

  return (
    <div className="videos-row">
      {items.map((item) => {
        const youtubeId =
          item.youtubeIds[lang] ?? item.youtubeIds.en;

        const thumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

        return (
          <button
            key={item.id}
            className="video-card"
            onClick={() => onSelectVideo(item.id)}
            aria-label={t.videosTitle}
          >
            <div className="video-thumbnail">
              <img src={thumbnail} alt="" loading="lazy" />
              <span className="video-play-icon">▶</span>
            </div>

            <div className="video-info">
              <div className="video-title">
                {t.videosTitle}
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