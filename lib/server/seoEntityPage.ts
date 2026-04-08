import countryNames from "@/utils/country_names.json";
import { getMapPopupContent } from "@/lib/server/mapPopup/getMapPopupContent";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { loadMapTargetsByIds, type MapTargetRow } from "@/lib/server/mapTargets";
import type { Lang } from "@/i18n";
import type { MapPopupType } from "@/types/mapPopup";
import type { GroupedStories, SeoEntityType } from "@/components/SeoEntityPage";

type MapStoryTargetRow = {
  type: MapPopupType;
  target_id: string;
  language: string;
};

const ROUTE_TYPE_MAP: Record<SeoEntityType, Array<keyof GroupedStories>> = {
  country: ["country", "culture", "food"],
  animal: ["animal", "weather"],
  river: ["river"],
  sea: ["sea"],
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

export function normalizeEntitySlug(value: string) {
  return decodeURIComponent(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  if (lang === "ru" && typeof mapTarget?.name_ru === "string" && mapTarget.name_ru.trim()) {
    return mapTarget.name_ru.trim();
  }

  if (lang === "he" && typeof mapTarget?.name_he === "string" && mapTarget.name_he.trim()) {
    return mapTarget.name_he.trim();
  }

  const normalizedSlug = normalizeEntitySlug(rawTargetId);
  const countryEntry = (countryNames as Record<string, { en?: string }>)[normalizedSlug];
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

  if (lang === "ru" && typeof mapTarget?.name_ru === "string" && mapTarget.name_ru.trim()) {
    return mapTarget.name_ru.trim();
  }

  if (lang === "he" && typeof mapTarget?.name_he === "string" && mapTarget.name_he.trim()) {
    return mapTarget.name_he.trim();
  }

  return slugToDisplayTitle(rawTargetId);
}

async function loadRouteTargetRows(entityType: SeoEntityType, lang: Lang) {
  const supabase = createServerSupabaseClient();
  const routeTypes = ROUTE_TYPE_MAP[entityType];
  const languages = Array.from(new Set([lang, "ru"]));
  const { data, error } = await supabase
    .from("map_stories")
    .select("type, target_id, language")
    .in("type", routeTypes)
    .in("language", languages);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? (data as MapStoryTargetRow[]) : [];
}

function resolveRawTargetIdFromSlug(rows: MapStoryTargetRow[], slug: string, lang: Lang) {
  const normalizedSlug = normalizeEntitySlug(slug);
  const preferredRows = [
    ...rows.filter((row) => row.language === lang),
    ...rows.filter((row) => row.language !== lang),
  ];

  const match = preferredRows.find((row) => normalizeEntitySlug(row.target_id) === normalizedSlug);
  return match?.target_id ?? null;
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

  const mapTargets = await loadMapTargetsByIds([rawTargetId]);
  const mapTarget = mapTargets.get(rawTargetId) || null;
  const title = resolveEntityDisplayTitle(entityType, rawTargetId, lang, mapTarget);
  const groupedStories = createEmptyGroups();
  const routeTypes = ROUTE_TYPE_MAP[entityType];
  const availableTypes = Array.from(
    new Set(
      routeTargetRows
        .filter((row) => row.target_id === rawTargetId)
        .map((row) => row.type)
        .filter((type): type is keyof GroupedStories => routeTypes.includes(type as keyof GroupedStories)),
    ),
  );

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
    if (!item || !SUPPORTED_GROUP_TYPES.includes(item.type)) {
      continue;
    }

    groupedStories[item.type].push(item.content);
  }

  const hasAnyStories = routeTypes.some((type) => groupedStories[type].length > 0);

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
    .in("type", ["country", "culture", "food", "animal", "weather", "river", "sea"]);

  if (error) {
    throw error;
  }

  const grouped = {
    country: new Set<string>(),
    animal: new Set<string>(),
    river: new Set<string>(),
    sea: new Set<string>(),
  };

  for (const row of (data || []) as Array<Pick<MapStoryTargetRow, "type" | "target_id">>) {
    const normalizedSlug = normalizeEntitySlug(row.target_id);
    if (!normalizedSlug || normalizedSlug === "none" || normalizedSlug === "__none") {
      continue;
    }

    if (["country", "culture", "food"].includes(row.type)) {
      grouped.country.add(normalizedSlug);
      continue;
    }

    if (["animal", "weather"].includes(row.type)) {
      grouped.animal.add(normalizedSlug);
      continue;
    }

    if (row.type === "river") {
      grouped.river.add(normalizedSlug);
      continue;
    }

    if (row.type === "sea") {
      grouped.sea.add(normalizedSlug);
    }
  }

  return {
    country: Array.from(grouped.country),
    animal: Array.from(grouped.animal),
    river: Array.from(grouped.river),
    sea: Array.from(grouped.sea),
  };
}
