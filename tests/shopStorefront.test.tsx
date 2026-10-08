import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { dictionaries } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getProductById } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/commerce";
import { SHOP_STOREFRONT_COPY } from "@/lib/shop/shopStorefront";

const product = getProductById("sound-case-001");
if (!product) throw new Error("Sound Case #001 catalog fixture is missing");

describe("LapLapLa shop storefront", () => {
  it("stores the approved provisional age and duration facts in every locale", () => {
    expect(product.recommendedAge).toEqual({
      ru: "9+ — в основном самостоятельно; 7+ — с ведущим-взрослым.",
      en: "Ages 9+ mostly independently; ages 7+ with an adult host.",
      he: "מגיל 9 — באופן עצמאי ברובו; מגיל 7 — בליווי מבוגר או מבוגרת שמנחים את המשחק.",
    });
    expect(product.duration).toEqual({
      ru: "Около 90–120 минут, в зависимости от размера и темпа группы.",
      en: "About 90–120 minutes, depending on group size and pace.",
      he: "כ־90–120 דקות, בהתאם לגודל הקבוצה ולקצב שלה.",
    });
    expect(JSON.stringify(product)).not.toContain("60–90 minutes after printing");
    expect(JSON.stringify(product)).not.toMatch(/solo|1–9 players/i);
  });

  it.each(["ru", "en", "he"] as const)("renders a truthful localized %s featured product", (lang) => {
    const html = renderToStaticMarkup(createElement(ShopProductCard, { product, lang }));
    const copy = SHOP_STOREFRONT_COPY[lang];

    expect(html).toContain(product.title[lang]);
    expect(html).toContain(product.subtitle[lang]);
    expect(html).toContain(product.recommendedAge?.[lang]);
    expect(html).toContain(product.duration?.[lang]);
    expect(html).toContain(formatPrice(product.price, product.currency, lang));
    expect(html).toContain("RU · EN · HE");
    expect(html).toContain(copy.availability);
    expect(html).toContain(product.heroImage);
    expect(html).toContain(`href="${buildLocalizedPublicPath("/shop/sound-case-001", lang)}"`);
    expect(html).not.toContain(`/shop/sound-case-001/create`);
    expect(html).not.toContain("Buy now");
  });

  it("keeps the Sound Case coming soon and uses one real catalog product", () => {
    expect(product.status).toBe("coming-soon");
    expect(product.heroImage).toContain("banner-horizontal.webp");
    const page = readFileSync(`${process.cwd()}/pages/shop/index.tsx`, "utf8");
    expect(page).toContain("getPublicProducts()");
    expect(page).toContain("ShopProductCard");
    expect(page).not.toMatch(/Product #002|Product #003/);
  });

  it("lists glue in the localized physical-kit requirements", () => {
    expect(dictionaries.ru.shop.soundCase.preview.requirements).toContain("Клей для сборки коробочек");
    expect(dictionaries.en.shop.soundCase.preview.requirements).toContain("Glue for assembling the card boxes");
    expect(dictionaries.he.shop.soundCase.preview.requirements).toContain("דבק להרכבת קופסאות הכרטיסים");
  });

  it("preserves real image proportions and mobile layout rules", () => {
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");
    expect(css).toMatch(/\.shop-product-card__visual img\s*\{[^}]*object-fit:\s*cover/s);
    expect(css).toMatch(/\.shop-product-card__visual\s*\{[^}]*aspect-ratio:\s*16 \/ 10/s);
    expect(css).toContain("@media (max-width: 520px)");
  });
});
