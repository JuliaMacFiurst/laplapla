import {
  parseUnknownSoundProgress,
  type UnknownSoundProgress,
} from "./unknownSoundScene";

export const UNKNOWN_SOUND_PROGRESS_STORAGE_KEY =
  "laplapla:quest:sound-case-001:stage-01:unknown-sound:v1";

export function loadUnknownSoundProgress(
  storage: Pick<Storage, "getItem">,
): UnknownSoundProgress | null {
  try {
    const raw = storage.getItem(UNKNOWN_SOUND_PROGRESS_STORAGE_KEY);
    return raw ? parseUnknownSoundProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveUnknownSoundProgress(
  storage: Pick<Storage, "setItem">,
  progress: UnknownSoundProgress,
): boolean {
  try {
    storage.setItem(
      UNKNOWN_SOUND_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress),
    );
    return true;
  } catch {
    return false;
  }
}
