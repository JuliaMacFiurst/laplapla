import { dictionaries, type Lang } from "../../i18n";

type VideoSearchProps = {
  lang: Lang;
};

export function VideoSearch({ lang }: VideoSearchProps) {
  return (
    <div className="video-search">
      <input
        type="text"
        className="video-search-input"
        placeholder={dictionaries[lang].video.searchPlaceholder}
        disabled
      />
      <div className="video-search-hint">
        {dictionaries[lang].video.searchHint}
      </div>
    </div>
  );
}