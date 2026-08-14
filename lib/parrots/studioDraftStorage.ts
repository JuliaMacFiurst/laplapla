export const PARROT_STUDIO_DRAFT_STORAGE_KEY = "parrot-studio-mobile-saved-v1";

export function saveParrotStudioDraft<T>(storage: Storage, draft: T) {
  storage.setItem(PARROT_STUDIO_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadParrotStudioDraft<T>(storage: Storage): T | null {
  const raw = storage.getItem(PARROT_STUDIO_DRAFT_STORAGE_KEY);
  return raw ? JSON.parse(raw) as T : null;
}

export function removeParrotStudioDraft(storage: Storage) {
  storage.removeItem(PARROT_STUDIO_DRAFT_STORAGE_KEY);
}
