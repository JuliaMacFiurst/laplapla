import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import manifest from "@/docs/production/svalbard-audio-v1/manifest.json";
import {
  QUEST_1_INITIAL_NARRATION,
  adjacentNarrationBlock,
  normalizeAvailableNarrationBlocks,
  selectNarrationBlock,
} from "@/components/Raccoons/quests/quest-1/narration/context";
import {
  playQuestNarrationAudio,
  stopQuestNarrationAudio,
  type QuestNarrationAudio,
} from "@/components/Raccoons/quests/quest-1/narration/audioRuntime";
import { QUEST_1_NARRATION_LABELS } from "@/components/Raccoons/quests/quest-1/narration/labels";
import {
  DEFAULT_QUEST_1_NARRATION_SETTINGS,
  QUEST_1_NARRATION_SETTINGS_KEY,
  persistQuest1NarrationSettings,
  readQuest1NarrationSettings,
} from "@/components/Raccoons/quests/quest-1/narration/settings";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class MockAudio implements QuestNarrationAudio {
  src = "";
  pauseCalls = 0;
  playCalls = 0;
  loadCalls = 0;
  removeCalls = 0;
  pause() { this.pauseCalls += 1; }
  play() { this.playCalls += 1; return Promise.resolve(); }
  load() { this.loadCalls += 1; }
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
    this.removeCalls += 1;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("Svalbard contextual narration catalog", () => {
  it("keeps all manifest IDs and locale paths unique", () => {
    expect(manifest.blocks).toHaveLength(83);
    expect(new Set(manifest.blocks.map((block) => block.id)).size).toBe(83);
    const paths = manifest.blocks.flatMap((block) => Object.values(block.audio));
    expect(paths).toHaveLength(249);
    expect(new Set(paths).size).toBe(249);
  });

  it("binds initial page context to stable manifest block IDs", () => {
    const known = new Set(manifest.blocks.map((block) => block.id));
    for (const pageBlocks of Object.values(QUEST_1_INITIAL_NARRATION)) {
      expect(pageBlocks.every((id) => known.has(id))).toBe(true);
    }
    expect(QUEST_1_INITIAL_NARRATION.day1[0]).toBe("svalbard.day01.intro.01");
  });

  it("moves only inside the currently available context", () => {
    const available = QUEST_1_INITIAL_NARRATION.day2;
    const first = selectNarrationBlock(available, null);
    const second = adjacentNarrationBlock(available, first, 1);
    expect(second).toBe("svalbard.day02.departure.02");
    expect(adjacentNarrationBlock(available, first, -1)).toBeNull();
    expect(adjacentNarrationBlock(available, available.at(-1) ?? null, 1)).toBeNull();
  });

  it("does not expose future days or the unselected route", () => {
    expect(QUEST_1_INITIAL_NARRATION.day3flight.every((id) => id.includes(".flight."))).toBe(true);
    expect(QUEST_1_INITIAL_NARRATION.day3sail.every((id) => id.includes(".sail."))).toBe(true);
    expect(QUEST_1_INITIAL_NARRATION.day3flight.some((id) => id.includes("day04"))).toBe(false);
  });

  it("deduplicates registrations and rejects unknown IDs", () => {
    expect(normalizeAvailableNarrationBlocks([
      "svalbard.day01.intro.01",
      "missing.future.block",
      "svalbard.day01.intro.01",
    ])).toEqual(["svalbard.day01.intro.01"]);
  });

  it("keeps the semantic block selected across locale changes", () => {
    const blockId = QUEST_1_INITIAL_NARRATION.day6_expedition[2];
    expect(manifest.blocks.find((block) => block.id === blockId)?.audio).toEqual({
      ru: "ru/day06/expedition/03.mp3",
      en: "en/day06/expedition/03.mp3",
      he: "he/day06/expedition/03.mp3",
    });
  });

  it("does not fall back to another locale and stays disabled without CDN configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL", "");
    const catalog = await import("@/components/Raccoons/quests/quest-1/narration/catalog");
    expect(catalog.resolveQuest1NarrationUrl("svalbard.day01.intro.01", "he")).toBeNull();
  });

  it("resolves the exact manifest path when the CDN feature is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL", "https://media.example.test/");
    const catalog = await import("@/components/Raccoons/quests/quest-1/narration/catalog");
    expect(catalog.resolveQuest1NarrationUrl("svalbard.day01.intro.01", "en")).toBe(
      "https://media.example.test/quests/quest-1/audio/v1/en/day01/intro/01.mp3",
    );
  });
});

describe("Svalbard narration audio runtime", () => {
  it("plays and pauses through a single mocked HTMLAudioElement", async () => {
    vi.stubGlobal("window", { location: { href: "https://laplapla.com/quests/quest-1" } });
    const audio = new MockAudio();
    await playQuestNarrationAudio(audio, "/audio/one.mp3");
    expect(audio.playCalls).toBe(1);
    expect(audio.loadCalls).toBe(1);
    stopQuestNarrationAudio(audio);
    expect(audio.pauseCalls).toBe(1);
    expect(audio.src).toBe("");
  });

  it("does not reload the same recording before resuming", async () => {
    vi.stubGlobal("window", { location: { href: "https://laplapla.com/quests/quest-1" } });
    const audio = new MockAudio();
    audio.src = "https://laplapla.com/audio/one.mp3";
    await playQuestNarrationAudio(audio, "/audio/one.mp3");
    expect(audio.loadCalls).toBe(0);
    expect(audio.playCalls).toBe(1);
  });
});

describe("Svalbard narration UI contract", () => {
  it("mounts exactly one shared player in each mutually exclusive engine", () => {
    const desktop = read("components/Raccoons/quests/quest-1/QuestEngine.tsx");
    const mobile = read("components/Raccoons/quests/quest-1/Quest1MobileEngine.tsx");
    expect(desktop.match(/<QuestNarrationPlayer/g)).toHaveLength(1);
    expect(mobile.match(/<QuestNarrationPlayer/g)).toHaveLength(1);
  });

  it("stops on page, locale and unmount transitions without touching progress", () => {
    const player = read("components/Raccoons/quests/quest-1/narration/QuestNarrationPlayer.tsx");
    expect(player).toContain("[available, pageId, stop]");
    expect(player).toContain("[locale, stop]");
    expect(player).toContain("audio.pause()");
    expect(player).not.toMatch(/advanceQuest1Progress|persistQuest1Progress|\bgo\(/);
  });

  it("uses localized accessible controls and an RTL container", () => {
    for (const locale of ["ru", "en", "he"] as const) {
      expect(Object.values(QUEST_1_NARRATION_LABELS[locale]).every(Boolean)).toBe(true);
    }
    const player = read("components/Raccoons/quests/quest-1/narration/QuestNarrationPlayer.tsx");
    expect(player).toContain('dir={locale === "he" ? "rtl" : "ltr"}');
    expect(player).toContain("aria-label");
    expect(player).toContain("disabled={!next}");
  });

  it("persists only narration preferences under its own key", () => {
    const storage = new MemoryStorage();
    persistQuest1NarrationSettings(storage, { enabled: false, collapsed: false });
    expect(readQuest1NarrationSettings(storage)).toEqual({ enabled: false, collapsed: false });
    expect(storage.values.has(QUEST_1_NARRATION_SETTINGS_KEY)).toBe(true);
    expect(storage.values.has("laplapla:quest-1:progress:v1")).toBe(false);
  });

  it("falls back safely for malformed or unavailable settings storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(QUEST_1_NARRATION_SETTINGS_KEY, "not-json");
    expect(readQuest1NarrationSettings(storage)).toEqual(DEFAULT_QUEST_1_NARRATION_SETTINGS);
    expect(readQuest1NarrationSettings(null)).toEqual(DEFAULT_QUEST_1_NARRATION_SETTINGS);
  });

  it("keeps the production feature hidden until both flag and CDN are configured", () => {
    const source = read("components/Raccoons/quests/quest-1/narration/catalog.ts");
    expect(source).toContain('NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED === "true"');
    expect(source).toContain("Boolean(configuredBaseUrl)");
  });
});
