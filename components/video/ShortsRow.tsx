import { dictionaries, type Lang } from "../../i18n";
import { VideoItem } from "../../content/videos";

type ShortsRowProps = {
  lang: Lang;
  items: VideoItem[];
  onSelectVideo: (youtubeId: string) => void;
};

export function ShortsRow({ lang, items, onSelectVideo }: ShortsRowProps) {
  const t = dictionaries[lang].video;

  if (!items.length) {
    return (
      <div className="shorts-row-empty">
        {t.emptyShorts ?? "Скоро здесь появятся видео"}
      </div>
    );
  }

  return (
    <div className="shorts-row">
      {items.map((item) => {
        const youtubeId = item.youtubeIds[lang] ?? item.youtubeIds.en;
        const thumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;

        return (
          <button
            key={item.id}
            className="short-card"
            onClick={() => onSelectVideo(item.id)}
            aria-label={t.openVideo ?? "Открыть видео"}
          >
            <div className="short-thumbnail">
              <img src={thumbnail} alt="" loading="lazy" />
              <span className="short-play-icon">▶</span>
            </div>

            <div className="short-title">
              {(t.categories as Record<string, string>)[item.categoryKey] ?? item.categoryKey}
            </div>
          </button>
        );
      })}
    </div>
  );
}