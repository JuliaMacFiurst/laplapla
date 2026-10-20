export type MiniGameDefinition = {
  id: string;
  route: `/mini-games/${string}`;
  sourceQuestId?: string;
  sourceCaseId?: string;
  tags: readonly string[];
};

/**
 * Lightweight discovery metadata for a future /mini-games index.
 * Games stay independently routed; a quest or hub can link to them by id.
 */
export const MINI_GAME_REGISTRY = [
  {
    id: "wake-the-dune",
    route: "/mini-games/wake-the-dune",
    sourceQuestId: "sound-case-001",
    sourceCaseId: "sound-case-001",
    tags: ["sound", "rhythm", "memory"],
  },
] as const satisfies readonly MiniGameDefinition[];

export type MiniGameId = (typeof MINI_GAME_REGISTRY)[number]["id"];
