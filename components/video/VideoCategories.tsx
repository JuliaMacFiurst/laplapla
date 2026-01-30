import { dictionaries, type Lang } from "../../i18n";

type VideoCategoriesProps = {
  lang: Lang;
};

export function VideoCategories({ lang }: VideoCategoriesProps) {
  const categories = dictionaries[lang].video.categories;
  return (
    <div className="video-categories">
      {Object.entries(categories).map(([key, label]) => (
        <button key={key} className="video-category-chip" disabled>
          {label}
        </button>
      ))}
    </div>
  );
}