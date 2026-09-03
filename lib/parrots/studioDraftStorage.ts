export const PARROT_STUDIO_DRAFT_STORAGE_KEY = "parrot-studio-mobile-saved-v1";

export function resolveParrotStudioEntryStyle(
  availableStyleIds: string[],
  styleFromQuery: string | null,
  styleFromImport: string | null,
  fallbackStyleSlug: string,
) {
  const explicitStyleSlug = [styleFromQuery, styleFromImport]
    .find((styleSlug): styleSlug is string => Boolean(styleSlug && availableStyleIds.includes(styleSlug)));

  return {
    styleSlug: explicitStyleSlug ?? fallbackStyleSlug,
    hasExplicitInitialStyle: Boolean(explicitStyleSlug),
  };
}

export function resolveParrotStudioDraftStyle(
  initialStyleSlug: string,
  hasExplicitInitialStyle: boolean,
  persistedStyleSlug?: string,
) {
  return hasExplicitInitialStyle
    ? initialStyleSlug
    : persistedStyleSlug || initialStyleSlug;
}

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
