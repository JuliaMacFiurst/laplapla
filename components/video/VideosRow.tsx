import { dictionaries, type Lang } from "../../i18n";

type VideosRowProps = {
  lang: Lang;
};

export function VideosRow({ lang }: VideosRowProps) {
  const t = dictionaries[lang].video;
  return (
    <div className="videos-row">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="video-card">
          <div className="video-thumbnail">
            <span className="video-placeholder-icon">▶</span>
          </div>

          <div className="video-info">
            <div className="video-title">
              {t.videosTitle}
            </div>
            <div className="video-meta">
              {t.subtitle ?? ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}