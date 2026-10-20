import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import manifest from "@/docs/production/svalbard-audio-v1/manifest.json";
import {
  QUEST_1_AUDIO_CDN_ORIGIN,
  QUEST_1_AUDIO_PATHS,
  QUEST_1_AUDIO_PREFIX,
  narrationRelativePath,
} from "@/components/Raccoons/quests/quest-1/narration/audioPaths";
import {
  adjacentNarrationBlock,
  normalizeAvailableNarrationBlocks,
  selectNarrationBlock,
} from "@/components/Raccoons/quests/quest-1/narration/context";
import {
  QUEST_1_INTEGRATED_BLOCKS,
  QUEST_1_UNAVAILABLE_BLOCKS,
  flightDialogueBlockId,
  garagePartBlockId,
  seaDialogueBlockId,
  starDialogueBlockId,
  takeoffHintBlockId,
} from "@/components/Raccoons/quests/quest-1/narration/gameMappings";
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

describe("Svalbard narration catalog and CDN contract", () => {
  it("contains all 83 unique manifest IDs and 249 unique locale paths", () => {
    expect(manifest.blocks).toHaveLength(83);
    expect(new Set(manifest.blocks.map((block) => block.id)).size).toBe(83);
    const paths = manifest.blocks.flatMap((block) => Object.values(block.audio));
    expect(paths).toHaveLength(249);
    expect(new Set(paths).size).toBe(249);
  });

  it("keeps the compact client catalog exactly synchronized with the authoritative manifest", () => {
    expect(Object.keys(QUEST_1_AUDIO_PATHS)).toHaveLength(83);
    for (const block of manifest.blocks) {
      const id = block.id as keyof typeof QUEST_1_AUDIO_PATHS;
      expect(QUEST_1_AUDIO_PATHS[id].order).toBe(block.order);
      for (const locale of ["ru", "en", "he"] as const) {
        expect(narrationRelativePath(id, locale)).toBe(block.audio[locale]);
      }
    }
  });

  it("does not ship the literary manifest or production reports through catalog.ts", () => {
    const source = read("components/Raccoons/quests/quest-1/narration/catalog.ts");
    expect(source).not.toMatch(/manifest\.json|extraction-report|antigravity/);
  });

  it("resolves the confirmed CDN origin and prefix exactly once", async () => {
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL", `${QUEST_1_AUDIO_CDN_ORIGIN}/`);
    const catalog = await import("@/components/Raccoons/quests/quest-1/narration/catalog");
    const url = catalog.resolveQuest1NarrationUrl("svalbard.day05.station.intro.04", "he");
    expect(url).toBe(
      "https://media.laplapla.com/quests/quest-1/audio/v1/he/day05/station/intro/04.mp3",
    );
    expect(url?.split(QUEST_1_AUDIO_PREFIX)).toHaveLength(2);
  });

  it("does not duplicate the prefix when an older local base URL includes it", async () => {
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED", "true");
    vi.stubEnv(
      "NEXT_PUBLIC_QUEST_1_AUDIO_BASE_URL",
      `${QUEST_1_AUDIO_CDN_ORIGIN}/${QUEST_1_AUDIO_PREFIX}/`,
    );
    const catalog = await import("@/components/Raccoons/quests/quest-1/narration/catalog");
    const url = catalog.resolveQuest1NarrationUrl("svalbard.day01.intro.01", "ru");
    expect(url).toBe(
      "https://media.laplapla.com/quests/quest-1/audio/v1/ru/day01/intro/01.mp3",
    );
    expect(url?.split(QUEST_1_AUDIO_PREFIX)).toHaveLength(2);
  });

  it("is feature-flagged off by default and never falls back to another language", async () => {
    vi.stubEnv("NEXT_PUBLIC_QUEST_1_AUDIO_ENABLED", "false");
    const catalog = await import("@/components/Raccoons/quests/quest-1/narration/catalog");
    expect(catalog.resolveQuest1NarrationUrl("svalbard.day01.intro.01", "ru")).toBeNull();
    expect(narrationRelativePath("svalbard.day01.intro.01", "he")).toMatch(/^he\//);
  });
});

describe("Svalbard gameplay availability", () => {
  it("classifies every manifest block as integrated or explicitly unavailable", () => {
    const integrated = new Set(QUEST_1_INTEGRATED_BLOCKS);
    const unavailable = new Set(Object.keys(QUEST_1_UNAVAILABLE_BLOCKS));
    expect(integrated.size).toBe(78);
    expect(unavailable.size).toBe(5);
    expect([...integrated].filter((id) => unavailable.has(id))).toEqual([]);
    expect(new Set([...integrated, ...unavailable])).toEqual(
      new Set(manifest.blocks.map((block) => block.id)),
    );
  });

  it("keeps a dynamic flight block unavailable before its route event", () => {
    expect(flightDialogueBlockId(undefined)).toBeNull();
    expect(flightDialogueBlockId("straight_1")).toBe("svalbard.day03.flight-dialogue.straight-1");
  });

  it("withholds unsafe mixed-state flight recordings", () => {
    expect(flightDialogueBlockId("straight_5")).toBeNull();
    expect(flightDialogueBlockId("arc_1")).toBeNull();
    expect(flightDialogueBlockId("zigzag_3")).toBeNull();
    expect(flightDialogueBlockId("afterCorrect_2")).toBeNull();
  });

  it("registers sea and star dialogue only for the currently displayed dialogue step", () => {
    expect(seaDialogueBlockId(undefined)).toBeNull();
    expect(seaDialogueBlockId("ice_1")).toBe("svalbard.day03.sail-dialogue.ice-1");
    expect(starDialogueBlockId("wrong_merak_no_id")).toBeNull();
    expect(starDialogueBlockId("merak_1")).toBeNull();
    expect(starDialogueBlockId("dubhe_1")).toBeNull();
  });

  it("isolates optional garage details from other rooms", () => {
    expect(garagePartBlockId(null)).toBeNull();
    expect(garagePartBlockId("dogs")).toBe("svalbard.day05.garage.part-dogs.01");
    expect(garagePartBlockId("dogs")).not.toMatch(/lab|heat/);
  });

  it("makes takeoff hints available only while their switch hint exists", () => {
    expect(takeoffHintBlockId(null)).toBeNull();
    expect(takeoffHintBlockId("switcher-on-14")).toBe("svalbard.day04.takeoff.hint-14");
    expect(takeoffHintBlockId("switcher-off-14")).toBeNull();
  });

  it("registers the mobile quiz explanation only after the checked state", () => {
    const mobile = read("components/Raccoons/quests/quest-1/Quest1MobileEngine.tsx");
    expect(mobile).toContain("checked && question?.explanation && explanationBlockId");
    expect(mobile).toContain('explanationBlockIds={[null, "svalbard.day03.flight.mercator-explanation.01", null]}');
  });

  it("removes page registrations by remounting a page-keyed narration scope", () => {
    const desktop = read("components/Raccoons/quests/quest-1/QuestEngine.tsx");
    const mobile = read("components/Raccoons/quests/quest-1/Quest1MobileEngine.tsx");
    expect(desktop).toContain("<QuestNarrationScope key={pageId}");
    expect(mobile).toContain("<QuestNarrationScope key={pageId}");
  });

  it("keeps flight and sail contexts isolated in their real page components", () => {
    const flight = read("components/Raccoons/quests/quest-1/pages/Day3Flight.tsx");
    const sail = read("components/Raccoons/quests/quest-1/pages/Day3Sail.tsx");
    expect(flight).toContain("flightDialogueBlockId");
    expect(flight).not.toContain("seaDialogueBlockId");
    expect(sail).toContain("seaDialogueBlockId");
    expect(sail).not.toContain("flightDialogueBlockId");
  });
});

describe("Svalbard player navigation and lifecycle", () => {
  it("moves Previous/Next only inside the supplied active context", () => {
    const available = normalizeAvailableNarrationBlocks([
      "svalbard.day05.station.intro.01",
      "svalbard.day05.station.intro.02",
    ]);
    const first = selectNarrationBlock(available, null);
    expect(adjacentNarrationBlock(available, first, -1)).toBeNull();
    expect(adjacentNarrationBlock(available, first, 1)).toBe("svalbard.day05.station.intro.02");
    expect(adjacentNarrationBlock(available, available[1] ?? null, 1)).toBeNull();
  });

  it("does not mutate gameplay progress from player or availability scope", () => {
    const sources = [
      read("components/Raccoons/quests/quest-1/narration/QuestNarrationPlayer.tsx"),
      read("components/Raccoons/quests/quest-1/narration/availability.tsx"),
    ].join("\n");
    expect(sources).not.toMatch(/advanceQuest1Progress|persistQuest1Progress|\bgo\(/);
  });

  it("stops when selected block disappears, on locale switch and on unmount", () => {
    const player = read("components/Raccoons/quests/quest-1/narration/QuestNarrationPlayer.tsx");
    expect(player).toContain("selectNarrationBlock(available, selectedRef.current)");
    expect(player).toContain("[locale, stop]");
    expect(player).toContain("stopQuestNarrationAudio(audioRef.current)");
  });

  it("uses one mocked audio element and unloads its source", async () => {
    vi.stubGlobal("window", { location: { href: "https://laplapla.com/quests/quest-1" } });
    const audio = new MockAudio();
    await playQuestNarrationAudio(audio, "/audio/one.mp3");
    expect(audio.playCalls).toBe(1);
    stopQuestNarrationAudio(audio);
    expect(audio.pauseCalls).toBe(1);
    expect(audio.src).toBe("");
  });

  it("does not reload the same source on repeated Play", async () => {
    vi.stubGlobal("window", { location: { href: "https://laplapla.com/quests/quest-1" } });
    const audio = new MockAudio();
    audio.src = "https://laplapla.com/audio/one.mp3";
    await playQuestNarrationAudio(audio, "/audio/one.mp3");
    expect(audio.loadCalls).toBe(0);
    expect(audio.playCalls).toBe(1);
  });

  it("stops the previous narration element before a new page starts playback", async () => {
    vi.stubGlobal("window", { location: { href: "https://laplapla.com/quests/quest-1" } });
    const previousPage = new MockAudio();
    const nextPage = new MockAudio();
    await playQuestNarrationAudio(previousPage, "/audio/ru/stars.mp3");
    await playQuestNarrationAudio(nextPage, "/audio/ru/station.mp3");
    expect(previousPage.pauseCalls).toBeGreaterThan(0);
    expect(previousPage.src).toBe("");
    expect(nextPage.playCalls).toBe(1);
    expect(nextPage.pauseCalls).toBe(0);
    stopQuestNarrationAudio(nextPage);
    expect(nextPage.src).toBe("");
  });

  it("keeps automatic continuation bounded by current available list", () => {
    const player = read("components/Raccoons/quests/quest-1/narration/QuestNarrationPlayer.tsx");
    expect(player).toContain("availableRef.current");
    expect(player).toContain("adjacentNarrationBlock");
    expect(player).not.toMatch(/QUEST_1_AUDIO_PATHS.*onEnded/s);
  });

  it("preserves localized accessible controls, RTL and compact UI", () => {
    for (const locale of ["ru", "en", "he"] as const) {
      expect(Object.values(QUEST_1_NARRATION_LABELS[locale]).every(Boolean)).toBe(true);
    }
    const player = read("components/Raccoons/quests/quest-1/narration/QuestNarrationPlayer.tsx");
    const css = read("styles/Quests.css");
    expect(player).toContain('dir={locale === "he" ? "rtl" : "ltr"}');
    expect(player).toContain("aria-label");
    expect(css).toContain(".quest-narration-player");
    expect(css).not.toContain("quest-narration-playlist");
  });

  it("persists only isolated narration preferences", () => {
    const storage = new MemoryStorage();
    persistQuest1NarrationSettings(storage, { enabled: false, collapsed: false });
    expect(readQuest1NarrationSettings(storage)).toEqual({ enabled: false, collapsed: false });
    expect(storage.values.has(QUEST_1_NARRATION_SETTINGS_KEY)).toBe(true);
    expect(storage.values.has("laplapla:quest-1:progress:v1")).toBe(false);
  });

  it("survives malformed or unavailable preference storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(QUEST_1_NARRATION_SETTINGS_KEY, "not-json");
    expect(readQuest1NarrationSettings(storage)).toEqual(DEFAULT_QUEST_1_NARRATION_SETTINGS);
    expect(readQuest1NarrationSettings(null)).toEqual(DEFAULT_QUEST_1_NARRATION_SETTINGS);
  });
});
