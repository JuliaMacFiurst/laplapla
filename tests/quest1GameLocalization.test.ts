import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { en } from "@/components/Raccoons/quests/quest-1/i18n/en";
import { he } from "@/components/Raccoons/quests/quest-1/i18n/he";
import { ru } from "@/components/Raccoons/quests/quest-1/i18n/ru";
import { getLabThings } from "@/components/Raccoons/quests/quest-1/i18n/labThings";

const flatten = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") return Object.values(value).flatMap(flatten);
  return [];
};

describe("Svalbard game UI localization", () => {
  it("keeps dictionary shapes complete and all values non-empty", () => {
    const shape = (value: unknown): unknown => Array.isArray(value)
      ? value.map(shape)
      : value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]))
        : typeof value;
    const gameUi = (dictionary: typeof ru) => ({
      day5Heat: dictionary.day5Heat,
      day5Garage: dictionary.day5Garage,
      day5Lab: dictionary.day5Lab,
      mapUi: dictionary.mapUi,
    });
    expect(shape(gameUi(en))).toEqual(shape(gameUi(ru)));
    expect(shape(gameUi(he))).toEqual(shape(gameUi(ru)));
    for (const dictionary of [ru, en, he]) {
      expect(flatten(dictionary).every((text) => text.trim().length > 0 || text === "")).toBe(true);
    }
  });

  it("has no Cyrillic fallback in English or Hebrew game UI", () => {
    const ui = (dictionary: typeof ru) => [dictionary.day5Heat, dictionary.day5Garage, dictionary.day5Lab, dictionary.mapUi];
    expect(flatten(ui(en)).join(" ")).not.toMatch(/[А-Яа-яЁё]/);
    expect(flatten(ui(he)).join(" ")).not.toMatch(/[А-Яа-яЁё]/);
  });

  it.each(["ru", "en", "he"] as const)("localizes every laboratory item for %s", (lang) => {
    const things = getLabThings(lang);
    expect(things).toHaveLength(28);
    expect(new Set(things.map((thing) => thing.id)).size).toBe(28);
    expect(things.every((thing) => thing.label.trim() && thing.loganComment.trim())).toBe(true);
    if (lang !== "ru") expect(things.map((thing) => `${thing.label} ${thing.loganComment}`).join(" ")).not.toMatch(/[А-Яа-яЁё]/);
  });

  it("localizes dog-sled results, controls and map accessibility labels", () => {
    expect(en.day5Garage.run).toMatchObject({ result: "Result", retry: "Try again", back: "Back", finish: "FINISH" });
    expect(he.day5Garage.run).toMatchObject({ result: "תוצאה", retry: "לנסות שוב", back: "חזרה", finish: "סיום" });
    expect(ru.mapUi.svalbard).toBe("Шпицберген");
    expect(en.mapUi.svalbard).toBe("Svalbard");
    expect(he.mapUi.svalbard).toBe("סבאלברד");
    expect([ru, en, he].every((dictionary) => dictionary.mapUi.zoomIn && dictionary.mapUi.zoomOut && dictionary.mapUi.resetZoom)).toBe(true);
  });

  it("does not introduce RTL mirroring into map or game geometry", () => {
    const sources = [
      "components/Raccoons/quests/quest-1/logic/FlightMap.tsx",
      "components/Raccoons/quests/quest-1/mobile/MobileSvgDrawMap.tsx",
      "components/Raccoons/quests/quest-1/logic/dog-sled-game/DogSledRunStage.tsx",
    ].map((path) => readFileSync(path, "utf8")).join("\n");
    expect(sources).not.toMatch(/scaleX\s*\(\s*-1\s*\)|direction:\s*rtl/);
  });

  it("keeps the narration production manifest unchanged", () => {
    const bytes = readFileSync("docs/production/svalbard-audio-v1/manifest.json");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("b08a612f0112fafb89d7c29fc89cf6acb462297ad37f716f8ed8448910828a1a");
  });
});
