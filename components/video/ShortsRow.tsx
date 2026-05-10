import Image from "next/image";
import { dictionaries, type Lang } from "../../i18n";
import { VideoItem } from "../../content/videos";

type ShortsRowProps = {
  lang: Lang;
  items: VideoItem[];
  onSelectVideo: (youtubeId: string) => void;
};

export function ShortsRow({ lang, items, onSelectVideo }: ShortsRowProps) {
  const t = dictionaries[lang].video;

  const SHORT_COLORS = [
    "pink",
    "lilac",
    "mint",
    "peach",
    "sky",
    "lemon",
  ] as const;

  const shorts = items.filter((item) => {
    if (item.format !== "short") return false;

    // visual — язык не важен, показываем всегда
    if (item.languageDependency === "visual") {
      return true;
    }

    // spoken — показываем только если язык поддерживается
    return item.contentLanguages.includes(lang);
  });

  if (!shorts.length) {
    return (
      <div className="shorts-row-empty">
        {t.emptyShorts ?? "Скоро здесь появятся видео"}
      </div>
    );
  }

  return (
    <div className="shorts-row">
      {shorts.map((item, index) => {
        const youtubeId = item.youtubeId;

        if (!youtubeId) {
          return null;
        }

        const thumbnail = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
        const shortTitle = item.title?.[lang] ?? item.title?.en ?? item.id;

        const color =
          SHORT_COLORS[index % SHORT_COLORS.length];

        return (
          <button
            key={item.youtubeId}
            className={`short-card ${color}`}
            onClick={() => 
              onSelectVideo(item.youtubeId)
            }
            aria-label={t.openVideo ?? "Открыть видео"}
          >
            <div className="short-thumbnail">
              <Image src={thumbnail} alt={shortTitle || "illustration"} width={320} height={568} loading="lazy" unoptimized />
              <span className="short-play-icon">▶</span>
            </div>

            <div className="short-title">
              {shortTitle}
            </div>
          </button>
        );
      })}
    </div>
  );
}
