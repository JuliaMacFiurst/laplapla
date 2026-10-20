import { describe, expect, it } from "vitest";
import { getBackgroundPositionX, BACKGROUND_LAYERS } from "@/components/Raccoons/quests/quest-1/logic/dog-sled-game/background/backgroundLayers";
import { FALLING_REMOVAL_LINE, MOBILE_FALLING_ITEM_MAX_HEIGHT, projectMobileFallingY } from "@/components/Raccoons/quests/quest-1/logic/lab-game/types";
import { getDay7VideoEmbedUrl } from "@/components/Raccoons/quests/quest-1/videoEmbeds";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { ru } from "@/components/Raccoons/quests/quest-1/i18n/ru";
import { en } from "@/components/Raccoons/quests/quest-1/i18n/en";
import { he } from "@/components/Raccoons/quests/quest-1/i18n/he";

describe("Svalbard regression invariants", () => {
  it("keeps every sled background layer continuous when the viewport-sized boundary is crossed", () => {
    for (const width of [390, 768, 1200]) {
      for (const layer of BACKGROUND_LAYERS) {
        const before = getBackgroundPositionX(width - 1, layer.speedMultiplier);
        const after = getBackgroundPositionX(width + 1, layer.speedMultiplier);
        expect(after).toBeLessThan(before);
        expect(Math.abs(after - before)).toBeLessThan(3);
      }
    }
  });

  it("keeps mobile laboratory items within their measured lane through removal", () => {
    for (const laneHeight of [456, 506, 536, 700]) {
      const start = projectMobileFallingY(-90, laneHeight);
      const catchY = projectMobileFallingY(450, laneHeight);
      const removal = projectMobileFallingY(FALLING_REMOVAL_LINE, laneHeight);
      expect(start).toBeLessThan(catchY);
      expect(catchY).toBeLessThan(removal);
      expect(removal + MOBILE_FALLING_ITEM_MAX_HEIGHT).toBeLessThanOrEqual(laneHeight);
    }
  });

  it("selects the finale video by locale with manual controls and no autoplay", () => {
    for (const [locale, videoId] of [
      ["ru", "sE2jxOVG8kU"],
      ["en", "2rGcFyxn5rM"],
      ["he", "2rGcFyxn5rM"],
    ] as const) {
      const url = new URL(getDay7VideoEmbedUrl(locale));
      expect(url.origin).toBe("https://www.youtube-nocookie.com");
      expect(url.pathname).toBe(`/embed/${videoId}`);
      expect(url.searchParams.get("controls")).toBe("1");
      expect(url.searchParams.get("playsinline")).toBe("1");
      expect(url.searchParams.has("autoplay")).toBe(false);
    }
  });

  it("returns to the localized store from Quest #1", () => {
    expect(buildLocalizedPublicPath("/shop", "ru")).toBe("/shop");
    expect(buildLocalizedPublicPath("/shop", "en")).toBe("/en/shop");
    expect(buildLocalizedPublicPath("/shop", "he")).toBe("/he/shop");
    expect([ru.engine.homeButton, ru.day7.backButton]).toEqual(["Вернуться в магазин", "Вернуться в магазин"]);
    expect([en.engine.homeButton, en.day7.backButton]).toEqual(["Back to Store", "Back to Store"]);
    expect([he.engine.homeButton, he.day7.backButton]).toEqual(["חזרה לחנות", "חזרה לחנות"]);
  });
});
