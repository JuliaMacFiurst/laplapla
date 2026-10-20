import { describe, expect, it } from "vitest";

import { en } from "@/components/Raccoons/quests/quest-1/i18n/en";
import { he } from "@/components/Raccoons/quests/quest-1/i18n/he";
import { ru } from "@/components/Raccoons/quests/quest-1/i18n/ru";
import {
  formatSeaRouteMessage,
  localizeSeaName,
  localizeSeaRoute,
} from "@/components/Raccoons/quests/quest-1/sail/seaRouteLocalization";

const route = ["North Sea", "Norwegian Sea", "Barents Sea"];

describe("Svalbard sea-route localization", () => {
  it("keeps the same geographic sequence in RU, EN and HE", () => {
    expect(localizeSeaRoute(route, "ru")).toBe(
      "Северное море, Норвежское море, Баренцево море",
    );
    expect(localizeSeaRoute(route, "en")).toBe(
      "North Sea, Norwegian Sea, Barents Sea",
    );
    expect(localizeSeaRoute(route, "he")).toBe(
      "ים הצפון, ים נורווגיה, ים ברנץ",
    );
  });

  it("formats Logan's actual localized route message", () => {
    expect(formatSeaRouteMessage(ru.day3Sail.mapSpeech.routeThroughSeas, route, "ru"))
      .toContain("Северное море, Норвежское море, Баренцево море");
    expect(formatSeaRouteMessage(en.day3Sail.mapSpeech.routeThroughSeas, route, "en"))
      .toContain("North Sea, Norwegian Sea, Barents Sea");
    expect(formatSeaRouteMessage(he.day3Sail.mapSpeech.routeThroughSeas, route, "he"))
      .toContain("ים הצפון, ים נורווגיה, ים ברנץ");
  });

  it("uses the semantic English map ID because the catalog has no en field", () => {
    expect(localizeSeaName("North Sea", "en")).toBe("North Sea");
  });

  it("falls back safely to a non-empty map ID when a translation is missing", () => {
    expect(localizeSeaName("Uncatalogued Sea", "ru")).toBe("Uncatalogued Sea");
    expect(localizeSeaName("Uncatalogued Sea", "he")).toBe("Uncatalogued Sea");
  });

  it("recomputes names from stable IDs when the locale changes", () => {
    const ids = new Set(route);
    expect(localizeSeaRoute(ids, "ru")).not.toBe(localizeSeaRoute(ids, "en"));
    expect(localizeSeaRoute(ids, "en")).not.toBe(localizeSeaRoute(ids, "he"));
    expect(Array.from(ids)).toEqual(route);
  });
});
