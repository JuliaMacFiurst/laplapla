import type { NextApiRequest, NextApiResponse } from "next";
import countryNames from "@/utils/country_names.json";
import { withApiHandler } from "@/utils/apiHandler";
import { getRequestLang } from "@/lib/i18n/routing";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import {
  getLocalizedMapTargetTitle,
  getMapTargetKey,
  loadMapTargetsByKeys,
} from "@/lib/server/mapTargets";
import {
  normalizeEntitySlug,
  resolveEntityDisplayTitle,
} from "@/lib/server/seoEntityPage";
import type { SeoEntityType } from "@/components/SeoEntityPage";
import type { MapPopupType } from "@/types/mapPopup";
import type { Lang } from "@/i18n";

type SearchEntityRoute = SeoEntityType;

type MapStoryRow = {
  id: string | number;
  type: MapPopupType;
  target_id: string;
};

type TranslationRow = {
  content_id: string | number;
  language: string;
  translation: unknown;
};

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

const ROUTE_TYPE_MAP: Record<SearchEntityRoute, MapPopupType[]> = {
  country: ["country", "culture", "food"],
  animal: ["animal", "weather"],
  river: ["river"],
  sea: ["sea"],
};

const SEARCHABLE_TYPES = Object.values(ROUTE_TYPE_MAP).flat();
const MAX_RESULTS = 20;

let cachedIndex: SearchIndexEntry[] | null = null;
let cacheTimestamp = 0;

const CACHE_TTL = 5 * 60 * 1000;

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

function parseTranslationRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function resolveRoute(type: MapPopupType): SearchEntityRoute | null {
  if (["country", "culture", "food"].includes(type)) {
    return "country";
  }

  if (["animal", "weather"].includes(type)) {
    return "animal";
  }

  if (type === "river") {
    return "river";
  }

  if (type === "sea") {
    return "sea";
  }

  return null;
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

async function buildIndex(): Promise<SearchIndexEntry[]> {
  const supabase = createServerSupabaseClient();
  const { data: storyRows, error: storyError } = await supabase
    .from("map_stories")
    .select("id, type, target_id")
    .in("type", SEARCHABLE_TYPES);

  if (storyError) {
    throw storyError;
  }

  const stories = Array.isArray(storyRows) ? (storyRows as MapStoryRow[]) : [];
  const storyIds = Array.from(new Set(stories.map((row) => String(row.id)).filter(Boolean)));
  const mapTargets = await loadMapTargetsByKeys(
    stories.map((row) => ({
      mapType: row.type,
      targetId: row.target_id,
    })),
  );

  const translationsByContentId = new Map<string, TranslationRow[]>();

  if (storyIds.length > 0) {
    const { data: translationRows, error: translationError } = await supabase
      .from("content_translations")
      .select("content_id, language, translation")
      .eq("content_type", "map_story")
      .in("content_id", storyIds);

    if (translationError) {
      throw translationError;
    }

    for (const row of (translationRows || []) as TranslationRow[]) {
      const key = String(row.content_id);
      const bucket = translationsByContentId.get(key) || [];
      bucket.push(row);
      translationsByContentId.set(key, bucket);
    }
  }

  const entries = new Map<string, SearchIndexEntry>();

  for (const story of stories) {
    const route = resolveRoute(story.type);
    if (!route) {
      continue;
    }

    const slug = normalizeEntitySlug(story.target_id);
    if (!slug || slug === "none" || slug === "__none") {
      continue;
    }

    const key = `${route}:${slug}`;
    const aliases = new Set<string>();
    const mapTarget = mapTargets.get(getMapTargetKey(story.type, story.target_id)) || null;
    const defaultTitle = resolveEntityDisplayTitle(route, story.target_id, "en", mapTarget);
    const titles: Partial<Record<Lang, string>> = route === "country"
      ? getCountryLocalizedTitles(slug)
      : {};

    const titleRu = getLocalizedMapTargetTitle(mapTarget, "ru");
    const titleEn = getLocalizedMapTargetTitle(mapTarget, "en");
    const titleHe = getLocalizedMapTargetTitle(mapTarget, "he");

    if (titleRu) {
      titles.ru = titleRu;
    }

    if (titleEn) {
      titles.en = titleEn;
    }

    if (titleHe) {
      titles.he = titleHe;
    }

    addAlias(aliases, story.target_id);
    addAlias(aliases, slug);
    addAlias(aliases, defaultTitle);
    addAlias(aliases, titles.ru);
    addAlias(aliases, titles.en);
    addAlias(aliases, titles.he);

    const translations = translationsByContentId.get(String(story.id)) || [];
    for (const translationRow of translations) {
      const translation = parseTranslationRecord(translationRow.translation);
      const translatedTitle = typeof translation?.title === "string" ? translation.title.trim() : "";
      if (!translatedTitle) {
        continue;
      }

      const translationLang = translationRow.language === "ru" || translationRow.language === "en" || translationRow.language === "he"
        ? translationRow.language
        : null;

      addAlias(aliases, translatedTitle);
      if (translationLang) {
        titles[translationLang] = translatedTitle;
      }
    }

    const existing = entries.get(key);
    if (existing) {
      existing.aliases = Array.from(new Set([...existing.aliases, ...aliases]));
      existing.titles = { ...titles, ...existing.titles };
      continue;
    }

    entries.set(key, {
      route,
      slug,
      rawTargetId: story.target_id,
      aliases: Array.from(aliases),
      titles: {
        en: defaultTitle,
        ...titles,
      },
    });
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
    return 100;
  }

  if (normalizedAlias.startsWith(query)) {
    return 70;
  }

  if (normalizedAlias.split(" ").includes(query)) {
    return 60;
  }

  if (normalizedAlias.includes(query)) {
    return 40;
  }

  return 0;
}

function searchIndex(index: SearchIndexEntry[], rawQuery: string, lang: Lang): SearchResponseItem[] {
  const query = normalizeSearchValue(rawQuery);
  if (!query) {
    return [];
  }

  return index
    .map((entry) => ({
      entry,
      score: entry.aliases.reduce((bestScore, alias) => Math.max(bestScore, scoreAlias(alias, query)), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.slug.localeCompare(right.entry.slug))
    .slice(0, MAX_RESULTS)
    .map(({ entry }) => ({
      route: entry.route,
      slug: entry.slug,
      href: `/${entry.route}/${entry.slug}`,
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
    cacheControl: "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  },
  handler,
);
