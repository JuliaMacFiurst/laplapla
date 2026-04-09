import type { MapPopupType } from "@/types/mapPopup";

export type CanonicalMapEntityType = "country" | "animal" | "river" | "sea" | "biome";

export type CanonicalEntityRow = {
  id?: string | number;
  type: string;
  target_id: string;
};

export type CanonicalRouteCollision = {
  canonicalKey: string;
  canonicalPath: string;
  canonicalType: CanonicalMapEntityType;
  slug: string;
  rawTargetIds: string[];
};

export type CanonicalRouteCasingIssue = {
  canonicalKey: string;
  canonicalPath: string;
  canonicalType: CanonicalMapEntityType;
  slug: string;
  rawTargetIds: string[];
};

type CanonicalRouteIssueOptions = {
  throwOnCollision?: boolean;
  logCasingWarnings?: boolean;
};

export const CANONICAL_MAP_ENTITY_TYPES: CanonicalMapEntityType[] = [
  "country",
  "animal",
  "river",
  "sea",
  "biome",
];

const STORY_TYPE_BY_CANONICAL_ROUTE: Record<CanonicalMapEntityType, MapPopupType[]> = {
  country: ["country", "culture", "food"],
  animal: ["animal", "weather"],
  river: ["river"],
  sea: ["sea"],
  biome: ["physic"],
};

const TYPE_ALIASES: Record<string, CanonicalMapEntityType> = {
  country: "country",
  countries: "country",
  animal: "animal",
  animals: "animal",
  river: "river",
  rivers: "river",
  sea: "sea",
  seas: "sea",
  ocean: "sea",
  oceans: "sea",
  biome: "biome",
  biomes: "biome",
  physic: "biome",
  physics: "biome",
  landscape: "biome",
  landscapes: "biome",
};

const CANONICAL_SLUG_OVERRIDES: Record<string, string> = {
  "animal:Tundra,  Wrangel island": "tundra-wrangel-island-2",
  "biome:Isthmus|CENTRAL AMERICA": "isthmus-central-america-2",
  "animal:Taiga and Boreal Forest": "taiga-and-boreal-forest-2",
  "animal:Saharan Halophytics, Flooded grasslands and savannas":
    "saharan-halophytics-flooded-grasslands-and-savannas-2",
  "animal:Mascarene Islands,Tropical and subtropical moist broadleaf forests":
    "mascarene-islands-tropical-and-subtropical-moist-broadleaf-forests-2",
  "animal:THE ZAMBEZIAN FLOODED GRASSLANDS,FLOODED GRASSLANDS AND SAVANNAS":
    "the-zambezian-flooded-grasslands-flooded-grasslands-and-savannas-2",
};

export function normalizeSlug(input: string): string {
  return decodeURIComponent(String(input || ""))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeMapEntityType(input: string): CanonicalMapEntityType | null {
  const normalized = String(input || "").trim().toLowerCase();
  return TYPE_ALIASES[normalized] ?? null;
}

export function resolveCanonicalTypeForRowType(input: string): CanonicalMapEntityType | null {
  return normalizeMapEntityType(input) || getCanonicalRouteForStoryType(input as MapPopupType);
}

export function getCanonicalRouteForStoryType(type: MapPopupType): CanonicalMapEntityType | null {
  if (type === "country" || type === "culture" || type === "food") {
    return "country";
  }

  if (type === "animal" || type === "weather") {
    return "animal";
  }

  if (type === "river") {
    return "river";
  }

  if (type === "sea") {
    return "sea";
  }

  if (type === "physic") {
    return "biome";
  }

  return null;
}

export function getStoryTypesForCanonicalRoute(type: CanonicalMapEntityType): MapPopupType[] {
  return STORY_TYPE_BY_CANONICAL_ROUTE[type];
}

export function resolveCanonicalSlug(type: string, targetId: string): string {
  const canonicalType = resolveCanonicalTypeForRowType(type);
  const rawTargetId = String(targetId || "").trim();

  if (canonicalType) {
    const override = CANONICAL_SLUG_OVERRIDES[`${canonicalType}:${rawTargetId}`];
    if (override) {
      return override;
    }
  }

  return normalizeSlug(rawTargetId);
}

export function buildCanonicalMapEntityPath(type: CanonicalMapEntityType, slug: string): string {
  return `/map/${type}/${normalizeSlug(slug)}`;
}

export function buildCanonicalMapEntityPathFromUnknown(type: string, slug: string): string | null {
  const normalizedType = normalizeMapEntityType(type);
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedType || !normalizedSlug) {
    return null;
  }

  return buildCanonicalMapEntityPath(normalizedType, normalizedSlug);
}

export function findCanonicalSlugConflicts(rows: CanonicalEntityRow[]) {
  const rawTargetIdsByCanonicalKey = new Map<string, Set<string>>();
  const casingMismatches = new Map<string, Set<string>>();
  const routeInfoByCanonicalKey = new Map<string, { canonicalType: CanonicalMapEntityType; slug: string }>();

  for (const row of rows) {
    const canonicalType = resolveCanonicalTypeForRowType(row.type);
    const normalizedSlug = resolveCanonicalSlug(row.type, row.target_id);

    if (!canonicalType || !normalizedSlug || normalizedSlug === "none" || normalizedSlug === "__none") {
      continue;
    }

    const canonicalKey = `${canonicalType}/${normalizedSlug}`;
    const rawTargetIds = rawTargetIdsByCanonicalKey.get(canonicalKey) || new Set<string>();
    rawTargetIds.add(String(row.target_id).trim());
    rawTargetIdsByCanonicalKey.set(canonicalKey, rawTargetIds);
    routeInfoByCanonicalKey.set(canonicalKey, { canonicalType, slug: normalizedSlug });

    const rawTargetId = String(row.target_id || "").trim();
    if (rawTargetId && rawTargetId !== normalizedSlug) {
      const mismatchValues = casingMismatches.get(canonicalKey) || new Set<string>();
      mismatchValues.add(rawTargetId);
      casingMismatches.set(canonicalKey, mismatchValues);
    }
  }

  const duplicateSlugConflicts: CanonicalRouteCollision[] = Array.from(rawTargetIdsByCanonicalKey.entries())
    .filter(([, rawTargetIds]) => rawTargetIds.size > 1)
    .map(([canonicalKey, rawTargetIds]) => {
      const routeInfo = routeInfoByCanonicalKey.get(canonicalKey);
      if (!routeInfo) {
        throw new Error(`Missing canonical route metadata for collision key: ${canonicalKey}`);
      }

      return {
        canonicalKey,
        canonicalPath: buildCanonicalMapEntityPath(routeInfo.canonicalType, routeInfo.slug),
        canonicalType: routeInfo.canonicalType,
        slug: routeInfo.slug,
        rawTargetIds: Array.from(rawTargetIds).sort(),
      };
    });

  const inconsistentCasing: CanonicalRouteCasingIssue[] = Array.from(casingMismatches.entries()).map(([canonicalKey, rawTargetIds]) => {
    const routeInfo = routeInfoByCanonicalKey.get(canonicalKey);
    if (!routeInfo) {
      throw new Error(`Missing canonical route metadata for casing key: ${canonicalKey}`);
    }

    return {
      canonicalKey,
      canonicalPath: buildCanonicalMapEntityPath(routeInfo.canonicalType, routeInfo.slug),
      canonicalType: routeInfo.canonicalType,
      slug: routeInfo.slug,
      rawTargetIds: Array.from(rawTargetIds).sort(),
    };
  });

  return {
    duplicateSlugConflicts,
    inconsistentCasing,
  };
}

export function warnAboutCanonicalRouteIssues(
  rows: CanonicalEntityRow[],
  source: string,
  options: CanonicalRouteIssueOptions = {},
) {
  const {
    throwOnCollision = process.env.NODE_ENV !== "production",
    logCasingWarnings = process.env.NODE_ENV !== "production",
  } = options;
  const { duplicateSlugConflicts, inconsistentCasing } = findCanonicalSlugConflicts(rows);
  const hasCollisions = duplicateSlugConflicts.length > 0;

  if (hasCollisions) {
    duplicateSlugConflicts.forEach((conflict) => {
      console.error(
        `[canonical-routes] ERROR collision in ${source}: ${conflict.canonicalPath} <- ${conflict.rawTargetIds.join(", ")}`,
      );
    });

    if (throwOnCollision) {
      const errorDetails = duplicateSlugConflicts
        .map((conflict) => `${conflict.canonicalPath}\n- ${conflict.rawTargetIds.join("\n- ")}`)
        .join("\n");

      throw new Error(`[canonical-routes] Duplicate canonical routes detected in ${source}\n${errorDetails}`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    return;
  }

  duplicateSlugConflicts.forEach((conflict) => {
    console.warn(`[canonical-routes] duplicate slug conflict in ${source}: ${conflict.canonicalPath} <- ${conflict.rawTargetIds.join(", ")}`);
  });

  if (logCasingWarnings) {
    inconsistentCasing.forEach((conflict) => {
      console.warn(`[canonical-routes] non-canonical casing in ${source}: ${conflict.canonicalPath} <- ${conflict.rawTargetIds.join(", ")}`);
    });
  }
}
