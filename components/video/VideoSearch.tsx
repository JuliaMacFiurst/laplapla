import { dictionaries, type Lang } from "../../i18n";

type VideoSearchProps = {
  lang: Lang;
  query: string;
  onChange: (value: string) => void;
};

export function VideoSearch({ lang, query, onChange }: VideoSearchProps) {
  return (
    <form
      lang={lang}
      className="video-search"
      onSubmit={(e) => {
        e.preventDefault();
        console.log("[VideoSearch] submit", { query });
        onChange(query);
      }}
    >
      <input
        type="text"
        className="video-search-input"
        placeholder={dictionaries[lang].video.searchPlaceholder}
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="video-search-hint">
        {dictionaries[lang].video.searchHint}
      </div>
      <button
        type="submit"
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </form>
  );
}