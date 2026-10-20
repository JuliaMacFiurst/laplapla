const SOUND_CASE_ROUTE_PATTERN = /^\/quests\/sound-case-\d{3}(?:\/|$)/;

export function isDarkSoundCaseRoute(pathname: string): boolean {
  return SOUND_CASE_ROUTE_PATTERN.test(pathname);
}

export const SOUND_CASE_001_HUMAN_EQUALIZER_PUBLIC_PATH =
  "/quests/sound-case-001/stage-03/equalizer" as const;
