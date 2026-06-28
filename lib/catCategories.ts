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
  key: string;
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
const DYNAMIC_CATEGORY_KEY_PREFIX = "custom:";

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

function buildCategorySlug(normalizedText: string) {
  return normalizedText
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function denormalizeCategorySlug(slug: string) {
  return slug
    .replace(/^custom:/, "")
    .replace(/-/g, " ")
    .trim();
}

function capitalizeCategoryLabel(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1) : "";
}

function splitMixedCategoryParts(normalizedText: string) {
  return normalizedText
    .split(/\s+(?:и|and|&)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findExactCategoryDefinition(normalizedText: string) {
  const compact = buildCategorySlug(normalizedText);
  const directMatch = CAT_CATEGORY_DEFINITIONS.find((category) => category.key === compact);
  if (directMatch) {
    return directMatch;
  }

  return CAT_CATEGORY_DEFINITIONS.find((category) =>
    category.aliases.some((alias) => normalizedText === alias.toLowerCase().replace(/ё/g, "е")),
  ) || null;
}

function findIncludedCategoryDefinition(normalizedText: string) {
  return CAT_CATEGORY_DEFINITIONS.find((category) =>
    category.key !== "science-general" &&
    category.aliases.some((alias) => normalizedText.includes(alias.toLowerCase().replace(/ё/g, "е"))),
  ) || null;
}

export function normalizeCatCategoryKey(value: unknown) {
  const rawValue = String(value ?? "").trim();
  if (rawValue.startsWith(DYNAMIC_CATEGORY_KEY_PREFIX)) {
    return rawValue;
  }

  const normalized = normalizeCategoryText(value);
  const matched = findCategoryDefinition(normalized);

  if (matched) {
    return matched.key;
  }

  const slug = buildCategorySlug(normalized);
  return slug ? `${DYNAMIC_CATEGORY_KEY_PREFIX}${slug}` : "misc";
}

function findCategoryDefinition(normalizedText: string) {
  if (!normalizedText) {
    return CATEGORY_BY_KEY.get("misc")!;
  }

  const exactAliasMatch = findExactCategoryDefinition(normalizedText);
  if (exactAliasMatch) {
    return exactAliasMatch;
  }

  const mixedParts = splitMixedCategoryParts(normalizedText);
  if (mixedParts.length > 1) {
    const matchedParts = mixedParts.map((part) =>
      findExactCategoryDefinition(part) || findIncludedCategoryDefinition(part),
    );

    if (matchedParts.some((part) => !part)) {
      return null;
    }
  }

  return findIncludedCategoryDefinition(normalizedText);
}

function inferDynamicCategoryGroup(normalizedText: string): CatCategoryGroupKey {
  const matchedCategory = findIncludedCategoryDefinition(normalizedText);
  if (matchedCategory) {
    return matchedCategory.groupKey;
  }

  if (/(лингвист|язык|социолог|эконом|прав|полит|linguist|language|society|law|politic|econom)/.test(normalizedText)) {
    return "human";
  }

  if (/(медиа|кино|книг|литератур|искусств|музык|культур|media|book|film|art|music|culture)/.test(normalizedText)) {
    return "culture";
  }

  if (/(живот|биолог|земл|океан|географ|animal|biology|earth|ocean|geography)/.test(normalizedText)) {
    return "world";
  }

  if (/(наук|физ|хим|косм|технолог|математ|science|physics|chem|space|tech|math)/.test(normalizedText)) {
    return "science";
  }

  return "human";
}

export function getCatCategoryMeta(key: string, lang: Lang, dynamicLabel?: string): ResolvedCatCategory {
  const category = CATEGORY_BY_KEY.get(key as CatCategoryKey);

  if (!category && key.startsWith(DYNAMIC_CATEGORY_KEY_PREFIX)) {
    const normalizedDynamicLabel = normalizeCategoryText(dynamicLabel || denormalizeCategorySlug(key));
    const groupKey = inferDynamicCategoryGroup(normalizedDynamicLabel);
    const group = GROUP_BY_KEY.get(groupKey)!;

    return {
      key,
      label: capitalizeCategoryLabel(dynamicLabel || denormalizeCategorySlug(key)),
      groupKey,
      groupLabel: getLabel(group.labels, lang),
      icon: "＋",
      order: 80,
    };
  }

  const knownCategory = category || CATEGORY_BY_KEY.get("misc")!;
  const group = GROUP_BY_KEY.get(knownCategory.groupKey)!;

  return {
    key: knownCategory.key,
    label: getLabel(knownCategory.labels, lang),
    groupKey: knownCategory.groupKey,
    groupLabel: getLabel(group.labels, lang),
    icon: knownCategory.icon,
    order: knownCategory.order,
  };
}

function getCategoryLabel(source: CatCategorySource) {
  return String(source.categoryLabel ?? source.category ?? source.categoryKey ?? "").trim();
}

function getCategoryKeySource(source: CatCategorySource) {
  const categoryKey = String(source.categoryKey ?? "").trim();
  if (categoryKey) {
    return categoryKey;
  }

  return String(source.category ?? source.categoryLabel ?? "").trim();
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
  const rawLabel = getCategoryLabel(source);
  const keySource = getCategoryKeySource(source);
  const key = normalizeCatCategoryKey(keySource);

  if (!key) {
    return null;
  }

  return getCatCategoryMeta(key, lang, rawLabel);
}
