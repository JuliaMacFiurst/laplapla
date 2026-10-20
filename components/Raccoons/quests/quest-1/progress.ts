export const QUEST_1_PROGRESS_KEY = "laplapla:quest-1:progress:v1";
export const QUEST_1_LEGACY_MOBILE_PROGRESS_KEY = "quest-1-mobile-page";

export const QUEST_1_PAGE_IDS = [
  "day1",
  "day2",
  "day3flight",
  "day3sail",
  "day4_takeoff",
  "day4_sail",
  "day5_spitsbergen",
  "day5_garage",
  "day5_heat",
  "day5_lab",
  "day6_expedition",
  "day7_treasure_of_times",
] as const;

export type Quest1PageId = (typeof QUEST_1_PAGE_IDS)[number];
export type Quest1Route = "flight" | "sail" | null;

export type Quest1Progress = {
  version: 1;
  pageId: Quest1PageId;
  route: Quest1Route;
  updatedAt: string;
};

type QuestStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PAGE_IDS = new Set<string>(QUEST_1_PAGE_IDS);
const FLIGHT_PAGES = new Set<Quest1PageId>(["day3flight", "day4_takeoff"]);
const SAIL_PAGES = new Set<Quest1PageId>(["day3sail", "day4_sail"]);

export function createInitialQuest1Progress(now = new Date()): Quest1Progress {
  return {
    version: 1,
    pageId: "day1",
    route: null,
    updatedAt: now.toISOString(),
  };
}

export function isQuest1PageId(value: unknown): value is Quest1PageId {
  return typeof value === "string" && PAGE_IDS.has(value);
}

function isValidRoute(value: unknown): value is Quest1Route {
  return value === null || value === "flight" || value === "sail";
}

function isCompatibleRoute(pageId: Quest1PageId, route: Quest1Route) {
  if (FLIGHT_PAGES.has(pageId)) return route === "flight";
  if (SAIL_PAGES.has(pageId)) return route === "sail";
  if (pageId === "day1" || pageId === "day2") return route === null;
  return true;
}

export function parseQuest1Progress(value: string | null): Quest1Progress | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      parsed.version !== 1 ||
      !isQuest1PageId(parsed.pageId) ||
      !isValidRoute(parsed.route) ||
      typeof parsed.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.updatedAt)) ||
      !isCompatibleRoute(parsed.pageId, parsed.route)
    ) {
      return null;
    }

    return parsed as Quest1Progress;
  } catch {
    return null;
  }
}

function progressForPage(
  current: Quest1Progress,
  pageId: Quest1PageId,
  now = new Date(),
): Quest1Progress {
  let route = current.route;
  if (pageId === "day1" || pageId === "day2") route = null;
  if (FLIGHT_PAGES.has(pageId)) route = "flight";
  if (SAIL_PAGES.has(pageId)) route = "sail";

  return { version: 1, pageId, route, updatedAt: now.toISOString() };
}

export function advanceQuest1Progress(
  current: Quest1Progress,
  pageId: Quest1PageId,
  now = new Date(),
) {
  return progressForPage(current, pageId, now);
}

export function readQuest1Progress(
  storage: QuestStorage | null | undefined,
  legacySessionStorage?: QuestStorage | null,
): Quest1Progress {
  const initial = createInitialQuest1Progress();
  if (!storage) return initial;

  try {
    const saved = parseQuest1Progress(storage.getItem(QUEST_1_PROGRESS_KEY));
    if (saved) return saved;

    const legacyPageId = legacySessionStorage?.getItem(QUEST_1_LEGACY_MOBILE_PROGRESS_KEY);
    if (isQuest1PageId(legacyPageId)) {
      const migrated = progressForPage(initial, legacyPageId);
      storage.setItem(QUEST_1_PROGRESS_KEY, JSON.stringify(migrated));
      legacySessionStorage?.removeItem(QUEST_1_LEGACY_MOBILE_PROGRESS_KEY);
      return migrated;
    }
  } catch {
    return initial;
  }

  return initial;
}

export function persistQuest1Progress(
  storage: QuestStorage | null | undefined,
  progress: Quest1Progress,
  hydrated: boolean,
) {
  if (!storage || !hydrated) return false;

  try {
    storage.setItem(QUEST_1_PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearQuest1Progress(storage: QuestStorage | null | undefined) {
  if (!storage) return false;

  try {
    storage.removeItem(QUEST_1_PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
}
