import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { MapPopupType } from "@/types/mapPopup";

export type MapTargetRow = {
  map_type: string;
  target_id: string;
  title_ru?: string | null;
  title_en?: string | null;
  title_he?: string | null;
};

export function getMapTargetKey(mapType: string, targetId: string) {
  return `${mapType}::${targetId}`;
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
    const supabase = createServerSupabaseClient();
    const mapTypes = Array.from(new Set(uniqueKeys.map((key) => key.mapType)));
    const targetIds = Array.from(new Set(uniqueKeys.map((key) => key.targetId)));
    const { data, error } = await supabase
      .from("map_targets")
      .select("map_type, target_id, title_ru, title_en, title_he")
      .in("map_type", mapTypes)
      .in("target_id", targetIds);

    if (error) {
      throw error;
    }

    return new Map(
      ((data || []) as MapTargetRow[])
        .filter((row) => typeof row.map_type === "string" && typeof row.target_id === "string")
        .map((row) => [getMapTargetKey(row.map_type, row.target_id), row] as const),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[map-targets] failed to load map_targets rows, falling back to target_id", error);
    }
    return new Map<string, MapTargetRow>();
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
