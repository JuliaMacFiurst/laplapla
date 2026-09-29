import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderQuestPageDefinition } from "@/components/shop/questPageRenderers";
import type { Lang } from "@/i18n";
import { SOUND_CASE_001_HUB_DESTINATION } from "@/lib/shop/quests/sound-case-001/finale";
import {
  SOUND_CASE_001_COLLECTIBLE_CARD_HEIGHT_MM,
  SOUND_CASE_001_COLLECTIBLE_CARD_WIDTH_MM,
  SOUND_CASE_001_COLLECTIBLE_HEROES,
  SOUND_CASE_001_COLLECTIBLE_HUB_QR_ASSET_PATH,
  getSoundCase001CollectibleCards,
  getSoundCase001CollectibleParticipants,
} from "@/lib/shop/quests/sound-case-001/collectibleCards";
import { SOUND_CASE_001_COLLECTIBLE_COPY } from "@/lib/shop/quests/sound-case-001/collectibleCardCopy";
import { SOUND_CASE_001_ASSET_MANIFEST, SOUND_CASE_001_COLLECTIBLE_ASSET_BASE_URL } from "@/lib/shop/quests/sound-case-001/assets";
import { getSoundCase001CollectiblePages } from "@/lib/shop/questDocument";
import { QuestPrintLab } from "@/components/shop/QuestPrintLab";

const root = process.cwd();

describe("Sound Case #001 collectible investigator cards", () => {
  it("keeps the exact physical size and packs up to nine cards on A4", () => {
    expect([SOUND_CASE_001_COLLECTIBLE_CARD_WIDTH_MM, SOUND_CASE_001_COLLECTIBLE_CARD_HEIGHT_MM]).toEqual([63, 88]);
    const css = readFileSync(`${root}/styles/Shop.css`, "utf8");
    expect(css).toContain("grid-template-columns: repeat(3, 65mm)");
    expect(css).toContain("grid-template-rows: repeat(3, 90mm)");
    expect(css).toContain("width: 63mm");
    expect(css).toContain("height: 88mm");
  });

  it("treats lead as the primary player and removes empty or duplicate names", () => {
    expect(getSoundCase001CollectibleParticipants({ locale: "ru", leadName: "  Майя  ", participants: ["", "МАЙЯ", "  Ноя   Лев ", "Ноя Лев", "Саша"] })).toEqual(["Майя", "Ноя Лев", "Саша"]);
  });

  it("creates one stable card per normalized player with distinct variants", () => {
    const personalization = { locale: "en" as const, leadName: "Player 1", participants: Array.from({ length: 11 }, (_, index) => `Player ${index + 2}`) };
    const first = getSoundCase001CollectibleCards(personalization);
    const second = getSoundCase001CollectibleCards(personalization);
    expect(second).toEqual(first);
    expect(first).toHaveLength(12);
    expect(new Set(first.map((card) => card.art.id))).toHaveLength(12);
    expect(new Set(first.map((card) => card.titleIndex))).toHaveLength(12);
    expect(first[6].variantCode).toMatch(/^SC001 · A07 · T\d{2}$/);
    expect(first.map((card) => card.stats)).toEqual([
      [5, 4, 5], [4, 5, 5], [5, 5, 4],
      [5, 4, 5], [4, 5, 5], [5, 5, 4],
      [5, 4, 5], [4, 5, 5], [5, 5, 4],
      [5, 4, 5], [4, 5, 5], [5, 5, 4],
    ]);
    expect(new Set(first.map((card) => card.stats.reduce((sum, value) => sum + value, 0)))).toEqual(new Set([14]));
    const source = readFileSync(`${root}/lib/shop/quests/sound-case-001/collectibleCards.ts`, "utf8");
    expect(source).not.toContain("Math.random");
  });

  it("creates front/back duplex pairs and mirrors columns for long-edge printing", () => {
    const personalization = { locale: "en" as const, leadName: "Lead", participants: Array.from({ length: 9 }, (_, index) => `Player ${index + 2}`) };
    const pages = getSoundCase001CollectiblePages(personalization);
    expect(pages).toHaveLength(4);
    expect(pages.map((page) => [page.sheetNumber, page.side, page.pairId])).toEqual([
      [1, "front", "sound-case-001-collectibles-sheet-1"], [1, "back", "sound-case-001-collectibles-sheet-1"],
      [2, "front", "sound-case-001-collectibles-sheet-2"], [2, "back", "sound-case-001-collectibles-sheet-2"],
    ]);
    const cards = getSoundCase001CollectibleCards(personalization);
    expect(cards.slice(0, 3).map(({ frontSlot, backSlot }) => [frontSlot, backSlot])).toEqual([[1,3],[2,2],[3,1]]);
  });

  it("shows reward counts and front/back pairs in the existing Print Lab", () => {
    const html = renderToStaticMarkup(createElement(QuestPrintLab, {
      initialStage: "REWARD",
      initialPersonalization: { locale: "ru", leadName: "Майя", participants: ["Ноя", "Саша"] },
    }));
    expect(html).toContain("3 personalized cards");
    expect(html).toContain("1 front/back pairs · 2 PDF pages · duplex long-edge");
    expect(html.match(/data-page-type="sound-case-collectible-cards"/g)).toHaveLength(2);
  });

  it.each(["ru", "en", "he"] as const)("renders localized %s fronts and backs with intentional RTL", (locale: Lang) => {
    const personalization = { locale, leadName: locale === "he" ? "אלכסנדרה ארוכת־השם" : "Alexandra Verylongname", participants: [] };
    const pages = getSoundCase001CollectiblePages(personalization);
    const context = { personalization, assetManifest: SOUND_CASE_001_ASSET_MANIFEST };
    const html = pages.map((page) => renderToStaticMarkup(renderQuestPageDefinition(page, context))).join("");
    const t = SOUND_CASE_001_COLLECTIBLE_COPY[locale];
    expect(html).toContain(t.stats[0]);
    expect(html).toContain(t.backClosed);
    expect(html).toContain(t.keepTitle);
    expect(html).toContain(locale === "he" ? "dir=\"rtl\"" : `lang=\"${locale}\"`);
    expect(html).toContain("22.975089° N");
    expect(html).toContain("53.785431° E");
  });

  it("keeps the front QR-free and uses only the case hub QR on the back", () => {
    const personalization = { locale: "en" as const, leadName: "Sensitive Child Name", participants: [] };
    const [front, back] = getSoundCase001CollectiblePages(personalization);
    const context = { personalization, assetManifest: SOUND_CASE_001_ASSET_MANIFEST };
    const frontHtml = renderToStaticMarkup(renderQuestPageDefinition(front, context));
    const backHtml = renderToStaticMarkup(renderQuestPageDefinition(back, context));
    expect(frontHtml).not.toContain("data-qr-destination");
    expect(frontHtml).not.toContain(SOUND_CASE_001_COLLECTIBLE_HUB_QR_ASSET_PATH);
    expect(frontHtml).not.toContain("ЭТОТ СЕРТИФИКАТ");
    expect(frontHtml).not.toContain("investigator-card__skills");
    expect(backHtml).toContain(`data-qr-destination=\"${SOUND_CASE_001_HUB_DESTINATION}\"`);
    expect(backHtml).toContain(`src=\"${SOUND_CASE_001_COLLECTIBLE_HUB_QR_ASSET_PATH}\"`);
    expect(backHtml).not.toContain("/laplapla-logo-letters.webp");
    expect(SOUND_CASE_001_HUB_DESTINATION).toBe("https://www.laplapla.com/quests/sound-case-001/hub");
    expect(SOUND_CASE_001_HUB_DESTINATION).not.toContain("Sensitive");
    expect(SOUND_CASE_001_HUB_DESTINATION).not.toContain("?");
  });

  it("keeps all twelve typed hero URLs and the correctly spelled remote back filename", () => {
    expect(SOUND_CASE_001_COLLECTIBLE_HEROES).toHaveLength(12);
    for (const hero of SOUND_CASE_001_COLLECTIBLE_HEROES) {
      expect(hero.objectPosition).toMatch(/^\d+% \d+%$/);
      const source = SOUND_CASE_001_ASSET_MANIFEST.assets[hero.assetId].source;
      expect(source.status).toBe("external");
      if (source.status === "external") expect(source.url).toMatch(new RegExp(`^${SOUND_CASE_001_COLLECTIBLE_ASSET_BASE_URL}/.+\\.webp$`));
    }
    const back = SOUND_CASE_001_ASSET_MANIFEST.assets["collectible-card-background"].source;
    expect(back.status === "external" ? back.url : "").toBe(`${SOUND_CASE_001_COLLECTIBLE_ASSET_BASE_URL}/collectable-card-background.webp`);
  });

  it("contains no fake scarcity or invented collectible identity", () => {
    const files = [
      `${root}/components/shop/SoundCaseCollectibleCardsPage.tsx`,
      `${root}/lib/shop/quests/sound-case-001/collectibleCards.ts`,
      `${root}/lib/shop/quests/sound-case-001/collectibleCardCopy.ts`,
    ].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(files).not.toMatch(/\/1000|publicCollectibleId|\?card=/);
  });

  it("uses an art-first front and a compact collection line without old dashboard panels", () => {
    const css = readFileSync(`${root}/styles/Shop.css`, "utf8");
    const component = readFileSync(`${root}/components/shop/SoundCaseCollectibleCardsPage.tsx`, "utf8");
    expect(css).toContain("grid-template-rows: 64.5mm 15.5mm 7mm");
    expect(component).toContain("investigator-card__stat-icon");
    expect(component).not.toContain("CATEGORY_ICONS");
    expect(component).not.toContain("investigator-card-back__categories");
    expect(component).not.toContain("investigator-card-back__note");
    expect(component).not.toContain("recipientLabel");
  });
});
