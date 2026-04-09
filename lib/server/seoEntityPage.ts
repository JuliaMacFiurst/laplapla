import countryNames from "@/utils/country_names.json";
import { getMapPopupContent } from "@/lib/server/mapPopup/getMapPopupContent";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import {
  getLocalizedMapTargetTitle,
  getMapTargetKey,
  loadMapTargetsByKeys,
  type MapTargetRow,
} from "@/lib/server/mapTargets";
import type { Lang } from "@/i18n";
import type { MapPopupType } from "@/types/mapPopup";
import type { GroupedStories, SeoEntityType } from "@/components/SeoEntityPage";
import {
  buildCanonicalMapEntityPath,
  getCanonicalRouteForStoryType,
  getStoryTypesForCanonicalRoute,
  normalizeSlug,
  warnAboutCanonicalRouteIssues,
} from "@/lib/mapEntityRouting";

type MapStoryTargetRow = {
  type: MapPopupType;
  target_id: string;
  language: string;
};

const SUPPORTED_GROUP_TYPES: Array<keyof GroupedStories> = [
  "country",
  "culture",
  "food",
  "animal",
  "weather",
  "river",
  "sea",
  "physic",
];

function isGroupedStoryType(value: MapPopupType): value is keyof GroupedStories {
  return SUPPORTED_GROUP_TYPES.includes(value as keyof GroupedStories);
}

export function normalizeEntitySlug(value: string) {
  return normalizeSlug(value);
}

export function slugToDisplayTitle(slug: string) {
  return decodeURIComponent(String(slug || ""))
    .trim()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function createEmptyGroups(): GroupedStories {
  return {
    country: [],
    culture: [],
    food: [],
    animal: [],
    weather: [],
    river: [],
    sea: [],
    physic: [],
  };
}

function resolveCountryDisplayTitle(rawTargetId: string, lang?: Lang, mapTarget?: MapTargetRow | null) {
  const localizedTitle = getLocalizedMapTargetTitle(mapTarget, lang);
  if (localizedTitle) {
    return localizedTitle;
  }

  const normalizedSlug = normalizeEntitySlug(rawTargetId);
  const countryEntry = (countryNames as Record<string, { ru?: string; en?: string; he?: string }>)[normalizedSlug];
  if (lang === "ru" && typeof countryEntry?.ru === "string" && countryEntry.ru.trim()) {
    return countryEntry.ru.trim();
  }
  if (lang === "he" && typeof countryEntry?.he === "string" && countryEntry.he.trim()) {
    return countryEntry.he.trim();
  }
  return typeof countryEntry?.en === "string" && countryEntry.en.trim()
    ? countryEntry.en.trim()
    : slugToDisplayTitle(rawTargetId);
}

export function resolveEntityDisplayTitle(
  entityType: SeoEntityType,
  rawTargetId: string,
  lang?: Lang,
  mapTarget?: MapTargetRow | null,
) {
  if (entityType === "country") {
    return resolveCountryDisplayTitle(rawTargetId, lang, mapTarget);
  }

  const localizedTitle = getLocalizedMapTargetTitle(mapTarget, lang);
  if (localizedTitle) {
    return localizedTitle;
  }

  return slugToDisplayTitle(rawTargetId);
}

async function loadRouteTargetRows(entityType: SeoEntityType, lang: Lang) {
  const supabase = createServerSupabaseClient();
  const routeTypes = getStoryTypesForCanonicalRoute(entityType);
  const languages = Array.from(new Set([lang, "ru"]));
  const { data, error } = await supabase
    .from("map_stories")
    .select("type, target_id, language")
    .in("type", routeTypes)
    .in("language", languages);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? (data as MapStoryTargetRow[]) : [];
  warnAboutCanonicalRouteIssues(rows, `loadRouteTargetRows:${entityType}`);
  return rows;
}

function resolveRawTargetIdFromSlug(rows: MapStoryTargetRow[], slug: string, lang: Lang) {
  const normalizedSlug = normalizeSlug(slug);
  const preferredRows = [
    ...rows.filter((row) => row.language === lang),
    ...rows.filter((row) => row.language !== lang),
  ];

  const match = preferredRows.find((row) => normalizeSlug(row.target_id) === normalizedSlug);
  return match?.target_id ?? null;
}

export async function resolveCanonicalEntityRouteBySlug(slug: string, lang: Lang) {
  const supabase = createServerSupabaseClient();
  const languages = Array.from(new Set([lang, "ru"]));
  const supportedTypes = ["country", "culture", "food", "animal", "weather", "river", "sea", "physic"];
  const { data, error } = await supabase
    .from("map_stories")
    .select("type, target_id, language")
    .in("type", supportedTypes)
    .in("language", languages);

  if (error) {
    throw error;
  }

  const normalizedSlug = normalizeSlug(slug);
  const rows = Array.isArray(data) ? (data as MapStoryTargetRow[]) : [];
  warnAboutCanonicalRouteIssues(rows, "resolveCanonicalEntityRouteBySlug", {
    throwOnCollision: false,
    logCasingWarnings: false,
  });

  const preferredRows = [
    ...rows.filter((row) => row.language === lang),
    ...rows.filter((row) => row.language !== lang),
  ];

  const match = preferredRows.find((row) => normalizeSlug(row.target_id) === normalizedSlug);
  if (!match) {
    return null;
  }

  const canonicalType = getCanonicalRouteForStoryType(match.type);
  if (!canonicalType) {
    return null;
  }

  return {
    type: canonicalType,
    slug: normalizedSlug,
    rawTargetId: match.target_id,
    canonicalPath: buildCanonicalMapEntityPath(canonicalType, normalizedSlug),
  };
}

export async function loadSeoEntityPageData(entityType: SeoEntityType, slug: string, lang: Lang) {
  const routeTargetRows = await loadRouteTargetRows(entityType, lang);
  const rawTargetId = resolveRawTargetIdFromSlug(routeTargetRows, slug, lang);

  if (!rawTargetId) {
    return {
      title: slugToDisplayTitle(slug),
      groupedStories: createEmptyGroups(),
      hasAnyStories: false,
    };
  }

  const groupedStories = createEmptyGroups();
  const routeTypes = getStoryTypesForCanonicalRoute(entityType);
  const availableTypes = Array.from(
    new Set(
      routeTargetRows
        .filter((row) => row.target_id === rawTargetId)
        .map((row) => row.type)
        .filter((type): type is keyof GroupedStories => routeTypes.includes(type as keyof GroupedStories)),
    ),
  );
  const mapTargets = await loadMapTargetsByKeys(
    availableTypes.map((type) => ({
      mapType: type,
      targetId: rawTargetId,
    })),
  );
  const primaryMapTarget =
    availableTypes
      .map((type) => mapTargets.get(getMapTargetKey(type, rawTargetId)) || null)
      .find(Boolean) || null;
  const title = resolveEntityDisplayTitle(entityType, rawTargetId, lang, primaryMapTarget);

  const resolvedStories = await Promise.all(
    availableTypes.map(async (type) => {
      const content = await getMapPopupContent({
        type,
        targetId: rawTargetId,
        lang,
      });

      return content ? { type, content } : null;
    }),
  );

  for (const item of resolvedStories) {
    if (!item || !isGroupedStoryType(item.type)) {
      continue;
    }

    groupedStories[item.type].push(item.content);
  }

  const hasAnyStories = routeTypes.some(
    (type) => isGroupedStoryType(type) && groupedStories[type].length > 0,
  );

  return {
    title,
    groupedStories,
    hasAnyStories,
  };
}

export async function loadSeoRouteSlugs() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("map_stories")
    .select("type, target_id")
    .in("type", ["country", "culture", "food", "animal", "weather", "river", "sea", "physic"]);

  if (error) {
    throw error;
  }

  const grouped = {
    country: new Set<string>(),
    animal: new Set<string>(),
    river: new Set<string>(),
    sea: new Set<string>(),
    biome: new Set<string>(),
  };

  for (const row of (data || []) as Array<Pick<MapStoryTargetRow, "type" | "target_id">>) {
    const normalizedSlug = normalizeSlug(row.target_id);
    if (!normalizedSlug || normalizedSlug === "none" || normalizedSlug === "__none") {
      continue;
    }

    const canonicalType = getCanonicalRouteForStoryType(row.type);
    if (canonicalType) {
      grouped[canonicalType].add(normalizedSlug);
    }
  }

  warnAboutCanonicalRouteIssues((data || []) as Array<Pick<MapStoryTargetRow, "type" | "target_id">>, "loadSeoRouteSlugs");

  return {
    country: Array.from(grouped.country),
    animal: Array.from(grouped.animal),
    river: Array.from(grouped.river),
    sea: Array.from(grouped.sea),
    biome: Array.from(grouped.biome),
  };
}
