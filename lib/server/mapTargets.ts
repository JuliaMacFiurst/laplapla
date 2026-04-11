import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { MapPopupType } from "@/types/mapPopup";
import { warnAboutCanonicalRouteIssues } from "@/lib/mapEntityRouting";

export type MapTargetRow = {
  map_type: string;
  target_id: string;
  title_ru?: string | null;
  title_en?: string | null;
  title_he?: string | null;
};

const MAP_TARGET_BATCH_SIZE = 100;
const MAP_TARGET_PAGE_SIZE = 1000;

export function getMapTargetKey(mapType: string, targetId: string) {
  return `${mapType}::${targetId}`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function normalizeMapTargetRows(rows: MapTargetRow[]) {
  return rows.filter((row) => typeof row.map_type === "string" && typeof row.target_id === "string");
}

export async function loadMapTargetsByKeys(keys: Array<{ mapType: string; targetId: string }>) {
  const uniqueKeys = Array.from(
    new Set(
      keys
        .map((key) => ({
          mapType: String(key.mapType || "").trim(),
          targetId: String(key.targetId || "").trim(),
        }))
        .filter((key) => key.mapType && key.targetId)
        .map((key) => getMapTargetKey(key.mapType, key.targetId)),
    ),
  ).map((composite) => {
    const [mapType, targetId] = composite.split("::");
    return { mapType, targetId };
  });

  if (uniqueKeys.length === 0) {
    return new Map<string, MapTargetRow>();
  }

  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const targetIdsByMapType = new Map<string, string[]>();

    for (const key of uniqueKeys) {
      const bucket = targetIdsByMapType.get(key.mapType) || [];
      bucket.push(key.targetId);
      targetIdsByMapType.set(key.mapType, bucket);
    }

    const rows: MapTargetRow[] = [];

    for (const [mapType, targetIds] of targetIdsByMapType.entries()) {
      for (const batchTargetIds of chunkArray(Array.from(new Set(targetIds)), MAP_TARGET_BATCH_SIZE)) {
        const { data, error } = await supabase
          .from("map_targets")
          .select("map_type, target_id, title_ru, title_en, title_he")
          .eq("map_type", mapType)
          .in("target_id", batchTargetIds);

        if (error) {
          throw error;
        }

        rows.push(...normalizeMapTargetRows((data || []) as MapTargetRow[]));
      }
    }

    warnAboutCanonicalRouteIssues(
      rows.map((row) => ({ type: row.map_type, target_id: row.target_id })),
      "map-targets",
      {
        throwOnCollision: false,
        logCasingWarnings: false,
      },
    );

    return new Map(rows.map((row) => [getMapTargetKey(row.map_type, row.target_id), row] as const));
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : null;

    if (errorCode === "42501") {
      return new Map<string, MapTargetRow>();
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn("[map-targets] failed to load map_targets rows, falling back to target_id", error);
    }
    return new Map<string, MapTargetRow>();
  }
}

export async function loadAllMapTargets(searchableTypes?: string[]) {
  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const rows: MapTargetRow[] = [];
    let from = 0;

    while (true) {
      let query = supabase
        .from("map_targets")
        .select("map_type, target_id, title_ru, title_en, title_he")
        .order("map_type", { ascending: true })
        .order("target_id", { ascending: true })
        .range(from, from + MAP_TARGET_PAGE_SIZE - 1);

      if (Array.isArray(searchableTypes) && searchableTypes.length > 0) {
        query = query.in("map_type", searchableTypes);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const batch = normalizeMapTargetRows((data || []) as MapTargetRow[]);
      rows.push(...batch);

      if (batch.length < MAP_TARGET_PAGE_SIZE) {
        break;
      }

      from += MAP_TARGET_PAGE_SIZE;
    }

    warnAboutCanonicalRouteIssues(
      rows.map((row) => ({ type: row.map_type, target_id: row.target_id })),
      "all-map-targets",
      {
        throwOnCollision: false,
        logCasingWarnings: false,
      },
    );

    return rows;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[map-targets] failed to load all map_targets rows", error);
    }

    return [] as MapTargetRow[];
  }
}

export function getLocalizedMapTargetTitle(mapTarget: MapTargetRow | null | undefined, lang?: "ru" | "en" | "he") {
  if (!mapTarget) {
    return null;
  }

  if (lang === "ru" && typeof mapTarget.title_ru === "string" && mapTarget.title_ru.trim()) {
    return mapTarget.title_ru.trim();
  }

  if (lang === "he" && typeof mapTarget.title_he === "string" && mapTarget.title_he.trim()) {
    return mapTarget.title_he.trim();
  }

  if (lang === "en" && typeof mapTarget.title_en === "string" && mapTarget.title_en.trim()) {
    return mapTarget.title_en.trim();
  }

  if (typeof mapTarget.title_en === "string" && mapTarget.title_en.trim()) {
    return mapTarget.title_en.trim();
  }

  if (typeof mapTarget.title_ru === "string" && mapTarget.title_ru.trim()) {
    return mapTarget.title_ru.trim();
  }

  if (typeof mapTarget.title_he === "string" && mapTarget.title_he.trim()) {
    return mapTarget.title_he.trim();
  }

  return null;
}

export type MapTargetLookupKey = {
  mapType: MapPopupType | string;
  targetId: string;
};
