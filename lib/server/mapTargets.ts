import { createServerSupabaseClient } from "@/lib/server/supabase";

export type MapTargetRow = {
  target_id: string;
  name_ru?: string | null;
  name_he?: string | null;
};

export async function loadMapTargetsByIds(targetIds: string[]) {
  const uniqueIds = Array.from(new Set(targetIds.map((value) => String(value || "").trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, MapTargetRow>();
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("map_target")
      .select("target_id, name_ru, name_he")
      .in("target_id", uniqueIds);

    if (error) {
      throw error;
    }

    return new Map(
      ((data || []) as MapTargetRow[])
        .filter((row) => typeof row.target_id === "string" && row.target_id.trim())
        .map((row) => [row.target_id, row] as const),
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[map-target] failed to load map_target rows, falling back to target_id", error);
    }
    return new Map<string, MapTargetRow>();
  }
}
