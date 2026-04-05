import { dictionaries, Lang } from "../../i18n";
import { devWarn } from "@/utils/devLog";

const CATEGORY_COLORS = [
  "pink",
  "lilac",
  "mint",
  "peach",
  "sky",
  "lemon",
] as const;

/**
 * Video categories whitelist.
 *
 * IMPORTANT:
 * - Это ЕДИНСТВЕННЫЙ источник категорий для UI (фильтры, кнопки).
 * - `categoryKey` в videos / shorts ДОЛЖЕН совпадать с одним из этих ключей.
 * - Имена файлов (animals.ts, physics.ts и т.д.) могут не совпадать с categoryKey.
 *   Файлы — для куратора, categoryKey — для продукта.
 */

// ===== ДАННЫЕ (whitelist категорий) =====

export const videoCategories = [
  { key: "animals", icon: "🐾" },
  { key: "science", icon: "🔬" },
  { key: "nature", icon: "🌿" },
  { key: "space", icon: "🚀" },
  { key: "art", icon: "🎨" },
  { key: "music", icon: "🎵" },
  { key: "human", icon: "🧠" },
  { key: "technology", icon: "💻" },
  { key: "math", icon: "➗" },
] as const;

export type VideoCategoryKey =
  (typeof videoCategories)[number]["key"];

// ===== UI‑КОМПОНЕНТ =====

type VideoCategoriesProps = {
  lang: Lang;
  activeCategoryKey: VideoCategoryKey | null;
  onSelectCategory: (key: VideoCategoryKey | null) => void;
};

export function VideoCategories({
  lang,
  activeCategoryKey,
  onSelectCategory,
}: VideoCategoriesProps) {
  const t = dictionaries[lang].video.categories;

  return (
    <div lang={lang} className="video-categories">
      {/* Кнопка "Все" */}
      <button
        className={`video-category-chip ${CATEGORY_COLORS[0]} ${
          activeCategoryKey === null ? "active" : ""
        }`}
        onClick={() => onSelectCategory(null)}
      >
        {t.all}
      </button>

      {videoCategories.map((category, index) => {
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        const label = t[category.key];

        if (!label) {
          devWarn(
            `[VideoCategories] Missing translation for category key: "${category.key}"`
          );
        }

        return (
          <button
            key={category.key}
            className={`video-category-chip ${color} ${
              activeCategoryKey === category.key ? "active" : ""
            }`}
            onClick={() => onSelectCategory(category.key)}
          >
            {category.icon && (
              <span className="category-icon">{category.icon}</span>
            )}
            {label ?? "—"}
          </button>
        );
      })}
    </div>
  );
}
