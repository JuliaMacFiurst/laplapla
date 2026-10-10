export const QUEST_1_NARRATION_SETTINGS_KEY = "laplapla:quest-1:narration:v1";

export type Quest1NarrationSettings = {
  enabled: boolean;
  collapsed: boolean;
};

export const DEFAULT_QUEST_1_NARRATION_SETTINGS: Quest1NarrationSettings = {
  enabled: true,
  collapsed: true,
};

type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

export function readQuest1NarrationSettings(storage: SettingsStorage | null | undefined) {
  if (!storage) return DEFAULT_QUEST_1_NARRATION_SETTINGS;
  try {
    const parsed = JSON.parse(storage.getItem(QUEST_1_NARRATION_SETTINGS_KEY) ?? "null") as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "enabled" in parsed &&
      "collapsed" in parsed &&
      typeof parsed.enabled === "boolean" &&
      typeof parsed.collapsed === "boolean"
    ) {
      return { enabled: parsed.enabled, collapsed: parsed.collapsed };
    }
  } catch {
    // Restricted or malformed storage falls back to safe defaults.
  }
  return DEFAULT_QUEST_1_NARRATION_SETTINGS;
}
export function persistQuest1NarrationSettings(
  storage: SettingsStorage | null | undefined,
  settings: Quest1NarrationSettings,
) {
  if (!storage) return false;
  try {
    storage.setItem(QUEST_1_NARRATION_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
