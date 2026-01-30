import { dictionaries, type Lang } from "../../i18n";

type ShortsRowProps = {
  lang: Lang;
};

export function ShortsRow({ lang }: ShortsRowProps) {
  const t = dictionaries[lang].video;
  return (
    <div className="shorts-row">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="short-card">
          <div className="short-thumbnail">
            <span className="short-placeholder-icon">▶</span>
          </div>
          <div className="short-title">
            {t.shortsTitle}
          </div>
        </div>
      ))}
    </div>
  );
}