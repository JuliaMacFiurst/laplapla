import type { Lang } from "@/i18n";
import type { BookGenreOption } from "@/lib/books/filters";

type RawCategoryRow = Record<string, unknown>;

const GROUPS: Record<string, { order: number; labels: Record<Lang, string> }> = {
  literature: { order: 10, labels: { ru: "Литература", en: "Literature", he: "ספרות" } },
  speculative: { order: 20, labels: { ru: "Фантастика", en: "Speculative fiction", he: "ספרות ספקולטיבית" } },
  mystery: { order: 30, labels: { ru: "Тайны и напряжение", en: "Mystery and suspense", he: "מסתורין ומתח" } },
  "classic-history": { order: 40, labels: { ru: "Классика и история", en: "Classics and history", he: "קלאסיקה והיסטוריה" } },
  ideas: { order: 50, labels: { ru: "Идеи и знания", en: "Ideas and knowledge", he: "רעיונות וידע" } },
  audience: { order: 60, labels: { ru: "Для читателей", en: "For readers", he: "לקוראים" } },
  other: { order: 90, labels: { ru: "Другие", en: "Other", he: "אחר" } },
};

// Bootstrap only: DB group_key wins. This keeps pre-migration rows organized during rollout.
const LEGACY_GROUP_BY_SLUG: Record<string, string> = {
  roman: "literature", drama: "literature", satira: "literature", skazka: "literature", priklyucheniya: "literature",
  fantasy: "speculative", fantastika: "speculative", "temnoe-fentezi": "speculative", "portalnoe-fentezi": "speculative",
  "nauchnaya-fantastika": "speculative", "magicheskij-realizm": "speculative", antiutopiya: "speculative",
  detective: "mystery", mistika: "mystery", uzhasy: "mystery",
  classic: "classic-history", "detskaya-klassika": "classic-history", istoricheskaya: "classic-history",
  science: "ideas", philosophy: "ideas", kids: "audience", podrostkovaya: "audience",
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function localizedLabel(row: RawCategoryRow, lang: Lang) {
  const translations = record(row.translations);
  const localized = text(translations?.[lang]);
  const localizedObject = record(translations?.[lang]);
  const nested = text(localizedObject?.label) || text(localizedObject?.name) || text(localizedObject?.title);
  const direct = text(row[`label_${lang}`]) || text(row[`name_${lang}`]) || text(row[`title_${lang}`]);
  const canonical = text(row.name) || text(row.label) || text(row.title) || text(row.category);
  return { label: localized || nested || direct || canonical, isFallback: !localized && !nested && !direct };
}

export function resolveBookGenre(row: RawCategoryRow, lang: Lang): BookGenreOption | null {
  const value = text(row.slug) || text(row.id) || text(row.name);
  const { label, isFallback } = localizedLabel(row, lang);
  if (!value || !label) return null;

  const requestedGroupKey = text(row.group_key) || text(row.taxonomy_group_key) || LEGACY_GROUP_BY_SLUG[text(row.slug)] || "other";
  const groupKey = GROUPS[requestedGroupKey] ? requestedGroupKey : "other";
  const group = GROUPS[groupKey];
  const rawOrder = Number(row.sort_order);

  return {
    value,
    label,
    groupKey,
    groupLabel: group.labels[lang] || group.labels.ru,
    groupOrder: group.order,
    order: Number.isFinite(rawOrder) ? rawOrder : 0,
    isFallback,
  };
}

export const BOOK_GENRE_GROUP_KEYS = Object.keys(GROUPS);
