import { VideoSearch } from "./VideoSearch";
import { VideoCategories } from "./VideoCategories";
import { ShortsRow } from "./ShortsRow";
import { VideosRow } from "./VideosRow";
import { dictionaries, Lang } from "../../i18n";

export function VideoSection({ lang }: { lang: Lang }) {
  const t = dictionaries[lang].video;

  return (
    <section className="video-section">
      {/* Заголовок */}
      <div className="video-section-header">
        <h2 className="video-section-title">
          {t.title}
        </h2>
        <p className="video-section-subtitle">
          {t.subtitle}
        </p>
      </div>

      {/* Поиск и категории */}
      <div className="video-section-controls">
        <VideoSearch />
        <VideoCategories />
      </div>

      {/* Shorts */}
      <div className="video-section-block">
        <h3 className="video-block-title">{t.shortsTitle}</h3>
        <ShortsRow />
      </div>

      {/* Обычные видео */}
      <div className="video-section-block">
        <h3 className="video-block-title">{t.videosTitle}</h3>
        <VideosRow />
      </div>
    </section>
  );
}