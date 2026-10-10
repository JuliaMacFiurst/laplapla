import { describe, expect, it } from "vitest";

import {
  QUEST_1_LEGACY_MOBILE_PROGRESS_KEY,
  QUEST_1_PROGRESS_KEY,
  advanceQuest1Progress,
  clearQuest1Progress,
  createInitialQuest1Progress,
  parseQuest1Progress,
  persistQuest1Progress,
  readQuest1Progress,
} from "@/components/Raccoons/quests/quest-1/progress";

class MemoryStorage {
  readonly values = new Map<string, string>();
  setCalls = 0;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.setCalls += 1;
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const now = new Date("2026-10-10T12:00:00.000Z");

describe("Svalbard quest progress persistence", () => {
  it("starts at day 1 on a first visit", () => {
    expect(readQuest1Progress(new MemoryStorage())).toMatchObject({ pageId: "day1", route: null });
  });

  it("restores the same saved page for desktop and mobile engines", () => {
    const storage = new MemoryStorage();
    const saved = advanceQuest1Progress(createInitialQuest1Progress(now), "day6_expedition", now);
    persistQuest1Progress(storage, saved, true);

    expect(readQuest1Progress(storage)).toEqual(saved);
    expect(readQuest1Progress(storage)).toEqual(saved);
  });

  it("restores the flight route across later shared stages", () => {
    const flight = advanceQuest1Progress(createInitialQuest1Progress(now), "day3flight", now);
    expect(flight.route).toBe("flight");
    expect(advanceQuest1Progress(flight, "day5_spitsbergen", now)).toMatchObject({
      pageId: "day5_spitsbergen",
      route: "flight",
    });
  });

  it("restores the sail route and Polaris navigation stage", () => {
    const sail = advanceQuest1Progress(createInitialQuest1Progress(now), "day3sail", now);
    expect(advanceQuest1Progress(sail, "day4_sail", now)).toMatchObject({
      pageId: "day4_sail",
      route: "sail",
    });
  });

  it.each(["day5_heat", "day5_lab", "day5_garage"] as const)(
    "restores optional station room %s",
    (pageId) => {
      const progress = advanceQuest1Progress(createInitialQuest1Progress(now), pageId, now);
      const storage = new MemoryStorage();
      persistQuest1Progress(storage, progress, true);
      expect(readQuest1Progress(storage).pageId).toBe(pageId);
    },
  );

  it("handles invalid JSON safely", () => {
    const storage = new MemoryStorage();
    storage.setItem(QUEST_1_PROGRESS_KEY, "{not-json");
    expect(readQuest1Progress(storage)).toMatchObject({ pageId: "day1", route: null });
  });

  it("rejects unknown page IDs", () => {
    const invalid = JSON.stringify({
      version: 1,
      pageId: "day99",
      route: null,
      updatedAt: now.toISOString(),
    });
    expect(parseQuest1Progress(invalid)).toBeNull();
  });

  it("rejects impossible route and page combinations", () => {
    const invalid = JSON.stringify({
      version: 1,
      pageId: "day4_sail",
      route: "flight",
      updatedAt: now.toISOString(),
    });
    expect(parseQuest1Progress(invalid)).toBeNull();
  });

  it("survives unavailable browser storage", () => {
    const unavailable = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(readQuest1Progress(unavailable).pageId).toBe("day1");
    expect(persistQuest1Progress(unavailable, createInitialQuest1Progress(now), true)).toBe(false);
    expect(clearQuest1Progress(unavailable)).toBe(false);
  });

  it("stores semantic state without locale-dependent values", () => {
    const serialized = JSON.stringify(
      advanceQuest1Progress(createInitialQuest1Progress(now), "day5_lab", now),
    );
    expect(serialized).not.toMatch(/locale|language|displayText|translation/);
    expect(parseQuest1Progress(serialized)?.pageId).toBe("day5_lab");
  });

  it("uses identical semantic pages across desktop/mobile transitions", () => {
    const storage = new MemoryStorage();
    const mobile = advanceQuest1Progress(createInitialQuest1Progress(now), "day4_takeoff", now);
    persistQuest1Progress(storage, mobile, true);
    expect(readQuest1Progress(storage)).toMatchObject({ pageId: "day4_takeoff", route: "flight" });
  });

  it("migrates the old mobile session page without competing storage", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    session.setItem(QUEST_1_LEGACY_MOBILE_PROGRESS_KEY, "day5_garage");

    expect(readQuest1Progress(local, session).pageId).toBe("day5_garage");
    expect(session.getItem(QUEST_1_LEGACY_MOBILE_PROGRESS_KEY)).toBeNull();
    expect(local.getItem(QUEST_1_PROGRESS_KEY)).not.toBeNull();
  });

  it("explicit restart clears only quest progress and returns to day 1", () => {
    const storage = new MemoryStorage();
    storage.setItem("unrelated", "keep-me");
    persistQuest1Progress(
      storage,
      advanceQuest1Progress(createInitialQuest1Progress(now), "day6_expedition", now),
      true,
    );

    clearQuest1Progress(storage);
    expect(readQuest1Progress(storage).pageId).toBe("day1");
    expect(storage.getItem("unrelated")).toBe("keep-me");
  });

  it("keeps the completed Day 7 screen until explicit restart", () => {
    const storage = new MemoryStorage();
    const completed = advanceQuest1Progress(
      createInitialQuest1Progress(now),
      "day7_treasure_of_times",
      now,
    );
    persistQuest1Progress(storage, completed, true);
    expect(readQuest1Progress(storage).pageId).toBe("day7_treasure_of_times");
  });

  it("does not overwrite saved progress before hydration", () => {
    const storage = new MemoryStorage();
    const saved = advanceQuest1Progress(createInitialQuest1Progress(now), "day5_heat", now);
    storage.setItem(QUEST_1_PROGRESS_KEY, JSON.stringify(saved));
    const callsBefore = storage.setCalls;

    expect(persistQuest1Progress(storage, createInitialQuest1Progress(now), false)).toBe(false);
    expect(storage.setCalls).toBe(callsBefore);
    expect(readQuest1Progress(storage)).toEqual(saved);
  });
});
