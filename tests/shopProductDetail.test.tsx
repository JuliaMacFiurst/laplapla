import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopProductDetail } from "@/components/shop/ShopProductDetail";
import { getProductById } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/commerce";
import { SOUND_CASE_PRODUCT_DETAIL_COPY } from "@/lib/shop/soundCaseProductDetail";

const product = getProductById("sound-case-001");

if (!product) {
  throw new Error("Sound Case #001 test catalog fixture is missing");
}

describe("Sound Case product merchandising detail", () => {
  it.each(["ru", "en", "he"] as const)("renders complete localized product content for %s", (lang) => {
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang }));
    const copy = SOUND_CASE_PRODUCT_DETAIL_COPY[lang];

    expect(html).toContain(product.title[lang]);
    expect(html).toContain(product.subtitle[lang]);
    expect(html).toContain(copy.whatIsTitle);
    expect(html).toContain(copy.includedTitle);
    expect(html).toContain(copy.galleryTitle);
    expect(html).toContain(copy.personalizationTitle);
    expect(html).toContain(copy.reuseTitle);
    expect(html).toContain(copy.trustTitle);
    expect(html).toContain(copy.sellerLabel);
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).toContain(`lang="${lang}"`);
    expect(html).not.toContain("undefined");
  });

  it("uses canonical catalog price and preserves coming-soon preorder routing", () => {
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang: "en" }));

    expect(product.price).toBe(4900);
    expect(product.currency).toBe("ILS");
    expect(product.status).toBe("coming-soon");
    expect(html).toContain(formatPrice(product.price, product.currency, "en"));
    expect(html).toContain('href="/en/shop/sound-case-001/preorder"');
    expect(html).not.toContain('href="/en/shop/sound-case-001/create"');
    expect(html).toContain(SOUND_CASE_PRODUCT_DETAIL_COPY.en.availability);
  });

  it("describes only implemented personalization and return behavior", () => {
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang: "en" }));

    expect(html).toContain("up to 8 team participants");
    expect(html).toContain("Choose the quest language");
    expect(html).toContain("lead participant");
    expect(html).toContain("Come back and print again");
    expect(html).toContain("saved to your account");
    expect(html).toContain("browser");
    expect(html).not.toMatch(/recommended age|years old|minutes|hours/i);
  });

  it("renders real catalog preview media with accessible gallery controls", () => {
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang: "en" }));

    expect(product.heroImage).toContain("banner-horizontal.webp");
    expect(product.previewPages).toHaveLength(4);
    expect(product.previewPages.every((url) => url.startsWith("https://"))).toBe(true);
    expect(html.match(/aria-pressed="/g)).toHaveLength(4);
    expect(html).toContain('role="group"');
    for (const label of SOUND_CASE_PRODUCT_DETAIL_COPY.en.galleryLabels) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("keeps product imagery proportional in hero, gallery, and thumbnails", () => {
    const css = readFileSync(`${process.cwd()}/styles/Shop.css`, "utf8");

    expect(css).toMatch(/\.sound-case-product__hero-media img\s*\{[^}]*object-fit:\s*cover/s);
    expect(css).toMatch(/\.sound-case-product__gallery-stage img\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toMatch(/\.sound-case-product__gallery-thumbs button img\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toContain("aspect-ratio: 16 / 10");
  });
});
