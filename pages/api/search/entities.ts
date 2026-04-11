import type { NextApiRequest, NextApiResponse } from "next";
import countryNames from "@/utils/country_names.json";
import { withApiHandler } from "@/utils/apiHandler";
import { getRequestLang } from "@/lib/i18n/routing";
import {
  getLocalizedMapTargetTitle,
  loadAllMapTargets,
  type MapTargetRow,
} from "@/lib/server/mapTargets";
import {
  resolveEntityDisplayTitle,
} from "@/lib/server/seoEntityPage";
import type { SeoEntityType } from "@/components/SeoEntityPage";
import type { MapPopupType } from "@/types/mapPopup";
import type { Lang } from "@/i18n";
import {
  buildCanonicalMapEntityPath,
  getCanonicalRouteForStoryType,
  resolveCanonicalSlug,
} from "@/lib/mapEntityRouting";

type SearchEntityRoute = SeoEntityType;

type SearchIndexEntry = {
  route: SearchEntityRoute;
  slug: string;
  rawTargetId: string;
  aliases: string[];
  titles: Partial<Record<Lang, string>>;
};

type SearchResponseItem = {
  route: SearchEntityRoute;
  slug: string;
  href: string;
  title: string;
  targetId: string;
};

const SEARCHABLE_TYPES: MapPopupType[] = ["country", "culture", "food", "animal", "weather", "river", "sea", "physic"];
const MAX_RESULTS = 100;

let cachedIndex: SearchIndexEntry[] | null = null;
let cacheTimestamp = 0;

const CACHE_TTL = 30 * 1000;

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ");
}

function resolveRoute(type: string): SearchEntityRoute | null {
  return getCanonicalRouteForStoryType(type as MapPopupType);
}

function getCountryLocalizedTitles(slug: string) {
  const entry = (countryNames as Record<string, { ru?: string; en?: string; he?: string }>)[slug];
  return {
    ru: typeof entry?.ru === "string" && entry.ru.trim() ? entry.ru.trim() : undefined,
    en: typeof entry?.en === "string" && entry.en.trim() ? entry.en.trim() : undefined,
    he: typeof entry?.he === "string" && entry.he.trim() ? entry.he.trim() : undefined,
  } satisfies Partial<Record<Lang, string>>;
}

function addAlias(target: Set<string>, value: unknown) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return;
  }

  target.add(rawValue);
  const normalized = normalizeSearchValue(rawValue);
  if (normalized) {
    target.add(normalized);
  }
}

const GENERIC_SEARCH_TERMS = new Set([
  "река",
  "реки",
  "river",
  "rivers",
  "море",
  "моря",
  "sea",
  "seas",
  "океан",
  "океаны",
  "ocean",
  "oceans",
  "mount",
  "mountain",
  "mountains",
  "lake",
  "lakes",
  "delta",
  "branch",
  "branches",
  "strait",
  "straits",
  "gulf",
  "gulfs",
  "bay",
  "bays",
  "island",
  "islands",
  "peninsula",
  "рукав",
  "рукава",
  "пролив",
  "проливы",
  "залив",
  "заливы",
  "остров",
  "острова",
  "полуостров",
  "полуострова",
  "гора",
  "горы",
  "озеро",
  "озера",
  "дельта",
  "ים",
  "נהר",
  "מפרץ",
  "מצר",
  "אי",
  "איים",
  "חצי",
  "האי",
  "הר",
  "אגם",
]);

function addExpandedAliases(target: Set<string>, value: unknown) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return;
  }

  addAlias(target, rawValue);

  const withoutParentheses = rawValue.replace(/\(([^)]+)\)/g, " ").trim();
  if (withoutParentheses && withoutParentheses !== rawValue) {
    addAlias(target, withoutParentheses);
  }

  for (const match of rawValue.matchAll(/\(([^)]+)\)/g)) {
    const innerValue = match[1]?.trim();
    if (innerValue) {
      addAlias(target, innerValue);
    }
  }

  for (const part of rawValue.split(/[,:;/]/g)) {
    const trimmedPart = part.trim();
    if (trimmedPart && trimmedPart !== rawValue) {
      addAlias(target, trimmedPart);
    }
  }

  const normalizedWords = normalizeSearchValue(rawValue)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  const significantWords = normalizedWords.filter((word) => !GENERIC_SEARCH_TERMS.has(word));

  if (significantWords.length > 0 && significantWords.length !== normalizedWords.length) {
    addAlias(target, significantWords.join(" "));
  }
}

function buildEntryFromMapTarget(mapTarget: MapTargetRow): SearchIndexEntry | null {
  const route = resolveRoute(mapTarget.map_type);
  if (!route) {
    return null;
  }

  const slug = resolveCanonicalSlug(mapTarget.map_type, mapTarget.target_id);
  if (!slug || slug === "none" || slug === "__none") {
    return null;
  }

  const aliases = new Set<string>();
  const titles: Partial<Record<Lang, string>> = route === "country"
    ? getCountryLocalizedTitles(slug)
    : {};

  const titleRu = getLocalizedMapTargetTitle(mapTarget, "ru");
  const titleEn = getLocalizedMapTargetTitle(mapTarget, "en");
  const titleHe = getLocalizedMapTargetTitle(mapTarget, "he");
  const defaultTitle = resolveEntityDisplayTitle(route, mapTarget.target_id, "en", mapTarget);

  if (titleRu) {
    titles.ru = titleRu;
  }

  if (titleEn) {
    titles.en = titleEn;
  }

  if (titleHe) {
    titles.he = titleHe;
  }

  addExpandedAliases(aliases, mapTarget.target_id);
  addExpandedAliases(aliases, slug);
  addExpandedAliases(aliases, defaultTitle);
  addExpandedAliases(aliases, titles.ru);
  addExpandedAliases(aliases, titles.en);
  addExpandedAliases(aliases, titles.he);

  return {
    route,
    slug,
    rawTargetId: mapTarget.target_id,
    aliases: Array.from(aliases),
    titles: {
      en: defaultTitle,
      ...titles,
    },
  };
}

async function buildIndex(): Promise<SearchIndexEntry[]> {
  const mapTargets = await loadAllMapTargets(SEARCHABLE_TYPES);
  const entries = new Map<string, SearchIndexEntry>();

  for (const mapTarget of mapTargets) {
    const entry = buildEntryFromMapTarget(mapTarget);
    if (!entry) {
      continue;
    }

    const key = `${entry.route}:${entry.slug}`;
    const existing = entries.get(key);

    if (existing) {
      existing.aliases = Array.from(new Set([...existing.aliases, ...entry.aliases]));
      existing.titles = { ...entry.titles, ...existing.titles };
      continue;
    }

    entries.set(key, entry);
  }

  return Array.from(entries.values());
}

async function getCachedIndex() {
  try {
    if (!cachedIndex || Date.now() - cacheTimestamp > CACHE_TTL) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[search] rebuilding index");
      }
      cachedIndex = await buildIndex();
      cacheTimestamp = Date.now();
    }

    return cachedIndex;
  } catch (error) {
    console.error("[search] index build failed", error);
    return [];
  }
}

function scoreAlias(alias: string, query: string) {
  const normalizedAlias = normalizeSearchValue(alias);
  if (!normalizedAlias) {
    return 0;
  }

  if (normalizedAlias === query) {
    return 120;
  }

  if (normalizedAlias.startsWith(query)) {
    return 90;
  }

  if (normalizedAlias.split(" ").includes(query)) {
    return 75;
  }

  if (normalizedAlias.includes(query)) {
    return 50;
  }

  return 0;
}

function scoreEntry(entry: SearchIndexEntry, query: string) {
  const bestAliasScore = entry.aliases.reduce((bestScore, alias) => Math.max(bestScore, scoreAlias(alias, query)), 0);
  if (bestAliasScore === 0) {
    return 0;
  }

  const aliasCountPenalty = Math.min(entry.aliases.length, 25) * 0.01;
  return bestAliasScore - aliasCountPenalty;
}

function searchIndex(index: SearchIndexEntry[], rawQuery: string, lang: Lang): SearchResponseItem[] {
  const query = normalizeSearchValue(rawQuery);
  if (!query) {
    return [];
  }

  return index
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, query),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.slug.localeCompare(right.entry.slug))
    .slice(0, MAX_RESULTS)
    .map(({ entry }) => ({
      route: entry.route,
      slug: entry.slug,
      href: buildCanonicalMapEntityPath(entry.route, entry.slug),
      targetId: entry.rawTargetId,
      title:
        entry.titles[lang] ||
        entry.titles.en ||
        resolveEntityDisplayTitle(entry.route, entry.rawTargetId, lang),
    }));
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponseItem[] | { error: string }>,
) {
  const rawQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

  if (!query) {
    return res.status(200).json([]);
  }

  const resolvedLang = getRequestLang(req);
  const lang: Lang = resolvedLang === "ru" || resolvedLang === "en" || resolvedLang === "he"
    ? resolvedLang
    : "ru";

  const index = await getCachedIndex();
  return res.status(200).json(searchIndex(index, query, lang));
}

export default withApiHandler(
  {
    guard: {
      methods: ["GET"],
      limit: 60,
      keyPrefix: "search-entities",
    },
    cacheControl: "private, no-store, max-age=0",
  },
  handler,
);
