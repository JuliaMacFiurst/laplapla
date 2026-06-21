import type { AnyCatPreset } from "@/content/cats";
import type { Lang } from "@/i18n";

type CatCategorySource = Pick<AnyCatPreset, "category" | "categoryKey" | "categoryLabel">;

type LocalizedLabel = Record<Lang, string>;

export type CatCategoryGroupKey = "science" | "world" | "culture" | "human";

export type CatCategoryKey =
  | "science-general"
  | "physics-math"
  | "chemistry"
  | "biology"
  | "animals"
  | "space"
  | "earth"
  | "history"
  | "art"
  | "books-media"
  | "music"
  | "mind-society"
  | "technology"
  | "internet"
  | "sport"
  | "misc";

export type ResolvedCatCategory = {
  key: CatCategoryKey;
  label: string;
  groupKey: CatCategoryGroupKey;
  groupLabel: string;
  icon: string;
  order: number;
};

export const CAT_CATEGORY_GROUPS: Array<{
  key: CatCategoryGroupKey;
  labels: LocalizedLabel;
  order: number;
}> = [
  {
    key: "science",
    order: 10,
    labels: {
      ru: "Наука",
      en: "Science",
      he: "מדע",
    },
  },
  {
    key: "world",
    order: 20,
    labels: {
      ru: "Планета и жизнь",
      en: "Planet and life",
      he: "העולם והחיים",
    },
  },
  {
    key: "culture",
    order: 30,
    labels: {
      ru: "Культура",
      en: "Culture",
      he: "תרבות",
    },
  },
  {
    key: "human",
    order: 40,
    labels: {
      ru: "Человек и общество",
      en: "People and society",
      he: "אדם וחברה",
    },
  },
];

const CAT_CATEGORY_DEFINITIONS: Array<{
  key: CatCategoryKey;
  groupKey: CatCategoryGroupKey;
  labels: LocalizedLabel;
  icon: string;
  order: number;
  aliases: string[];
}> = [
  {
    key: "science-general",
    groupKey: "science",
    order: 5,
    icon: "◇",
    labels: {
      ru: "Научные вопросы",
      en: "Science questions",
      he: "שאלות מדע",
    },
    aliases: ["наука", "науч", "science"],
  },
  {
    key: "physics-math",
    groupKey: "science",
    order: 10,
    icon: "⚛",
    labels: {
      ru: "Физика и математика",
      en: "Physics and math",
      he: "פיזיקה ומתמטיקה",
    },
    aliases: ["физ", "квант", "математ", "геометр", "маятник", "physics", "quantum", "math", "geometry"],
  },
  {
    key: "chemistry",
    groupKey: "science",
    order: 20,
    icon: "⚗",
    labels: {
      ru: "Химия и вещества",
      en: "Chemistry",
      he: "כימיה",
    },
    aliases: ["хим", "углерод", "водород", "карбон", "chem", "carbon", "hydrogen"],
  },
  {
    key: "biology",
    groupKey: "world",
    order: 10,
    icon: "🧬",
    labels: {
      ru: "Биология и эволюция",
      en: "Biology and evolution",
      he: "ביולוגיה ואבולוציה",
    },
    aliases: ["биолог", "эволюц", "нейробиолог", "мозг", "biology", "evolution", "neuro", "brain"],
  },
  {
    key: "animals",
    groupKey: "world",
    order: 20,
    icon: "🐾",
    labels: {
      ru: "Животные",
      en: "Animals",
      he: "חיות",
    },
    aliases: ["живот", "зоолог", "птиц", "акул", "динозав", "animal", "zoology", "bird", "shark", "dinosaur"],
  },
  {
    key: "space",
    groupKey: "science",
    order: 30,
    icon: "✦",
    labels: {
      ru: "Космос",
      en: "Space",
      he: "חלל",
    },
    aliases: ["космос", "астро", "галакт", "луна", "черн", "space", "astro", "galaxy", "moon", "black-hole"],
  },
  {
    key: "earth",
    groupKey: "world",
    order: 30,
    icon: "⌖",
    labels: {
      ru: "Земля и география",
      en: "Earth and geography",
      he: "כדור הארץ וגיאוגרפיה",
    },
    aliases: ["земл", "географ", "геолог", "океан", "вулкан", "остров", "путешеств", "earth", "geography", "geology", "ocean", "volcano", "island", "travel"],
  },
  {
    key: "history",
    groupKey: "human",
    order: 10,
    icon: "⌛",
    labels: {
      ru: "История и общество",
      en: "History and society",
      he: "היסטוריה וחברה",
    },
    aliases: ["истор", "антрополог", "общество", "геополит", "государств", "диктатор", "history", "anthropology", "society", "geopolitics"],
  },
  {
    key: "art",
    groupKey: "culture",
    order: 10,
    icon: "◈",
    labels: {
      ru: "Искусство и культура",
      en: "Art and culture",
      he: "אמנות ותרבות",
    },
    aliases: ["искусств", "культур", "ваби", "карти", "худож", "art", "culture", "artist"],
  },
  {
    key: "books-media",
    groupKey: "culture",
    order: 20,
    icon: "▣",
    labels: {
      ru: "Книги, кино и медиа",
      en: "Books, film and media",
      he: "ספרים, קולנוע ומדיה",
    },
    aliases: ["книг", "литератур", "кино", "фэнтези", "гарри", "нарни", "медиа", "поп-культур", "books", "literature", "film", "media", "fantasy"],
  },
  {
    key: "music",
    groupKey: "culture",
    order: 30,
    icon: "♪",
    labels: {
      ru: "Музыка и звук",
      en: "Music and sound",
      he: "מוזיקה וסאונד",
    },
    aliases: ["музык", "звук", "нота", "тишин", "music", "sound", "note", "silence"],
  },
  {
    key: "mind-society",
    groupKey: "human",
    order: 20,
    icon: "◌",
    labels: {
      ru: "Психология и философия",
      en: "Psychology and philosophy",
      he: "פסיכולוגיה ופילוסופיה",
    },
    aliases: ["психолог", "философ", "эмпат", "выбор", "милгр", "мозг", "psychology", "philosophy", "choice"],
  },
  {
    key: "technology",
    groupKey: "science",
    order: 40,
    icon: "⌘",
    labels: {
      ru: "Технологии и будущее",
      en: "Technology and future",
      he: "טכנולוגיה ועתיד",
    },
    aliases: ["технолог", "будущее", "инфракрас", "смартфон", "робот", "technology", "future", "smartphone", "robot"],
  },
  {
    key: "internet",
    groupKey: "culture",
    order: 40,
    icon: "#",
    labels: {
      ru: "Интернет-культура",
      en: "Internet culture",
      he: "תרבות אינטרנט",
    },
    aliases: ["интернет", "мем", "капибар", "dreamcore", "internet", "meme"],
  },
  {
    key: "sport",
    groupKey: "human",
    order: 30,
    icon: "◍",
    labels: {
      ru: "Спорт и тело",
      en: "Sport and body",
      he: "ספורט וגוף",
    },
    aliases: ["спорт", "гимнаст", "тело", "sport", "gymnast", "body"],
  },
  {
    key: "misc",
    groupKey: "human",
    order: 90,
    icon: "…",
    labels: {
      ru: "Разное",
      en: "Other",
      he: "שונות",
    },
    aliases: [],
  },
];

const CATEGORY_BY_KEY = new Map(CAT_CATEGORY_DEFINITIONS.map((category) => [category.key, category]));
const GROUP_BY_KEY = new Map(CAT_CATEGORY_GROUPS.map((group) => [group.key, group]));

function getLabel(labels: LocalizedLabel, lang: Lang) {
  return labels[lang] || labels.ru;
}

function normalizeCategoryText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCatCategoryKey(value: unknown) {
  const normalized = normalizeCategoryText(value);
  const matched = findCategoryDefinition(normalized);
  return matched.key;
}

function findCategoryDefinition(normalizedText: string) {
  if (!normalizedText) {
    return CATEGORY_BY_KEY.get("misc")!;
  }

  const compact = normalizedText.replace(/\s+/g, "-");
  const directMatch = CAT_CATEGORY_DEFINITIONS.find((category) => category.key === compact);
  if (directMatch) {
    return directMatch;
  }

  const exactAliasMatch = CAT_CATEGORY_DEFINITIONS.find((category) =>
    category.aliases.some((alias) => normalizedText === alias.toLowerCase().replace(/ё/g, "е")),
  );
  if (exactAliasMatch) {
    return exactAliasMatch;
  }

  return CAT_CATEGORY_DEFINITIONS.find((category) =>
    category.key !== "science-general" &&
    category.aliases.some((alias) => normalizedText.includes(alias.toLowerCase().replace(/ё/g, "е"))),
  ) || CATEGORY_BY_KEY.get("misc")!;
}

export function getCatCategoryMeta(key: string, lang: Lang): ResolvedCatCategory {
  const category = CATEGORY_BY_KEY.get(key as CatCategoryKey) || CATEGORY_BY_KEY.get("misc")!;
  const group = GROUP_BY_KEY.get(category.groupKey)!;

  return {
    key: category.key,
    label: getLabel(category.labels, lang),
    groupKey: category.groupKey,
    groupLabel: getLabel(group.labels, lang),
    icon: category.icon,
    order: category.order,
  };
}

export function getCatCategoryGroups(lang: Lang) {
  return CAT_CATEGORY_GROUPS
    .map((group) => ({
      key: group.key,
      label: getLabel(group.labels, lang),
      order: group.order,
    }))
    .sort((left, right) => left.order - right.order);
}

export function resolveCatCategory(source: CatCategorySource, lang: Lang = "ru"): ResolvedCatCategory | null {
  const rawValue = source.categoryKey ?? source.category ?? source.categoryLabel ?? "";
  const key = normalizeCatCategoryKey(rawValue);

  if (!key) {
    return null;
  }

  return getCatCategoryMeta(key, lang);
}
