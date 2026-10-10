import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShopFreeExperienceCard } from "@/components/shop/ShopFreeExperienceCard";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import {
  SHOP_FREE_EXPERIENCES,
  SVALBARD_FREE_EXPERIENCE,
} from "@/lib/shop/freeExperiences";
import { getProductById } from "@/lib/shop/catalog";

describe("Svalbard free shop experience", () => {
  it("appears exactly once in the free catalog and uses the games category", () => {
    expect(SHOP_FREE_EXPERIENCES.filter((item) => item.id === "svalbard-quest-1")).toHaveLength(1);
    expect(SVALBARD_FREE_EXPERIENCE.category).toBe("games");
  });

  it.each([
    ["ru", "Экспедиция на Шпицберген", "Бесплатно", "Начать приключение", "/quests/quest-1"],
    ["en", "Svalbard Expedition", "Free", "Start the adventure", "/en/quests/quest-1"],
    ["he", "משלחת לסבאלברד", "חינם", "מתחילים בהרפתקה", "/he/quests/quest-1"],
  ] as const)("renders localized direct launch for %s", (lang, title, label, cta, href) => {
    const html = renderToStaticMarkup(createElement(ShopFreeExperienceCard, {
      experience: SVALBARD_FREE_EXPERIENCE,
      lang,
    }));
    expect(html).toContain(title);
    expect(html).toContain(label);
    expect(html).toContain(cta);
    expect(html).toContain(SVALBARD_FREE_EXPERIENCE.description[lang]);
    expect(html).toContain(`href="${href}"`);
    expect(buildLocalizedPublicPath(SVALBARD_FREE_EXPERIENCE.href, lang)).toBe(href);
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).not.toMatch(/₪|PayPal|Buy|Купить|לקנות|entitlement|sign.?in/i);
  });

  it("is a direct browser experience without price, commerce, download, or entitlement fields", () => {
    expect(SVALBARD_FREE_EXPERIENCE).not.toHaveProperty("price");
    expect(SVALBARD_FREE_EXPERIENCE).not.toHaveProperty("commerce");
    expect(SVALBARD_FREE_EXPERIENCE).not.toHaveProperty("entitlement");
    expect(SVALBARD_FREE_EXPERIENCE).not.toHaveProperty("download");
  });

  it("keeps Sound Case catalog data unchanged", () => {
    const soundCase = getProductById("sound-case-001");
    expect(soundCase).toMatchObject({ price: 4900, status: "coming-soon", sortOrder: 1 });
  });

  it("keeps the CTA visible and touch-sized on mobile without hover dependency", () => {
    const css = readFileSync("styles/Shop.css", "utf8");
    expect(css).toMatch(/\.shop-free-experience__copy a\s*\{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.shop-free-experience__copy a\s*\{[^}]*width:\s*100%/s);
    expect(css).not.toMatch(/\.shop-free-experience[^}]*:hover[^}]*display:\s*(block|flex|grid)/s);
  });

  it("is rendered by the shop page without changing the paid product route", () => {
    const page = readFileSync("pages/shop/index.tsx", "utf8");
    expect(page).toContain("SHOP_FREE_EXPERIENCES.map");
    expect(page).toContain("ShopFreeExperienceCard");
    expect(page).toContain("ShopProductCard");
  });
});
