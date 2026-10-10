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
    expect(html).toContain(SVALBARD_FREE_EXPERIENCE.age[lang]);
    expect(html).toContain(SVALBARD_FREE_EXPERIENCE.durationLabel[lang]);
    expect(html).toContain(SVALBARD_FREE_EXPERIENCE.duration[lang]);
    expect(html).toContain(SVALBARD_FREE_EXPERIENCE.format[lang]);
    expect(html).toContain(SVALBARD_FREE_EXPERIENCE.priceValue[lang]);
    expect(html).toContain("RU · EN · HE");
    expect(html).toContain("shop-product-card__facts");
    expect(html).toContain("shop-product-card__purchase");
    expect(html).toContain("shop-product-card__visual--svalbard");
    expect(html).toContain("shop-product-card__visual-backdrop");
    expect(html).toContain("shop-product-card__visual-poster");
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
    expect(SVALBARD_FREE_EXPERIENCE.image).toBe(
      "/supabase-storage/quests/1_quest/images/first-quest-afisha.webp",
    );
  });

  it("uses the approved localized playtime and never renders the former placeholder", () => {
    expect(SVALBARD_FREE_EXPERIENCE.durationLabel).toEqual({
      ru: "Время прохождения",
      en: "Playtime",
      he: "משך המשחק",
    });
    expect(SVALBARD_FREE_EXPERIENCE.duration).toEqual({
      ru: "От 25 минут. Продолжительность зависит от времени, проведённого в мини-играх, и повторных попыток.",
      en: "25 minutes or more. Playtime depends on how long you spend on mini-games and retries.",
      he: "25 דקות ומעלה. משך המשחק תלוי בזמן שמקדישים למשחקונים ולניסיונות חוזרים.",
    });
    expect(JSON.stringify(SVALBARD_FREE_EXPERIENCE)).not.toMatch(
      /Уточняется после проверки|To be confirmed after a timed playthrough|ייקבע לאחר בדיקת זמן/,
    );
    expect(SVALBARD_FREE_EXPERIENCE.age).toEqual({ ru: "7+", en: "7+", he: "7+" });
    expect(SVALBARD_FREE_EXPERIENCE.priceValue).toEqual({
      ru: "Полностью бесплатно",
      en: "Completely free",
      he: "חינם לגמרי",
    });
  });

  it("keeps Sound Case catalog data unchanged", () => {
    const soundCase = getProductById("sound-case-001");
    expect(soundCase).toMatchObject({ price: 4900, status: "coming-soon", sortOrder: 1 });
  });

  it("keeps the CTA visible and touch-sized on mobile without hover dependency", () => {
    const css = readFileSync("styles/Shop.css", "utf8");
    expect(css).toMatch(/\.shop-product-card__purchase a,[\s\S]*min-height:\s*48px/s);
    expect(css).toMatch(/@media \(max-width: 520px\)[\s\S]*\.shop-product-card__purchase a\s*\{[^}]*width:\s*100%/s);
    expect(css).not.toMatch(/\.shop-product-card--free[^}]*:hover[^}]*display:\s*(block|flex|grid)/s);
  });

  it("contains only the Svalbard poster while preserving the shared Sound Case crop", () => {
    const css = readFileSync("styles/Shop.css", "utf8");
    const soundCase = readFileSync("components/shop/ShopProductCard.tsx", "utf8");

    expect(css).toMatch(
      /\.shop-product-card__visual--svalbard \.shop-product-card__visual-poster\s*\{[^}]*object-fit:\s*contain;[^}]*object-position:\s*center;/s,
    );
    expect(css).toMatch(
      /\.shop-product-card__visual--svalbard \.shop-product-card__visual-backdrop\s*\{[^}]*object-fit:\s*cover;/s,
    );
    expect(css).toMatch(
      /\.shop-product-card__visual img\s*\{[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/s,
    );
    expect(soundCase).toContain('className="shop-product-card__visual"');
    expect(soundCase).not.toContain("shop-product-card__visual--svalbard");
  });

  it("is rendered by the shop page without changing the paid product route", () => {
    const page = readFileSync("pages/shop/index.tsx", "utf8");
    expect(page).toContain("SHOP_FREE_EXPERIENCES.map");
    expect(page).toContain("ShopFreeExperienceCard");
    expect(page).toContain("ShopProductCard");
  });
});
