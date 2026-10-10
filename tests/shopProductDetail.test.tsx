import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopProductDetail } from "@/components/shop/ShopProductDetail";
import { getSoundCaseVideoPresentationMedia } from "@/components/shop/SoundCaseVideoPresentation";
import { getProductById } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/commerce";
import { SOUND_CASE_PRODUCT_INCLUDED_MEDIA } from "@/lib/shop/soundCasePromoMedia";
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
    expect(html).toContain(copy.videoPresentation.label);
    expect(html).toContain(copy.videoPresentation.heading);
    expect(html).toContain(copy.videoPresentation.description);
    expect(html).toContain(`aria-label="${copy.videoPresentation.playLabel}"`);
    expect(html).toContain(copy.includedTitle);
    expect(html).toContain(copy.galleryTitle);
    expect(html).toContain(copy.personalizationTitle);
    expect(html).toContain(copy.reuseTitle);
    expect(html).toContain(copy.trustTitle);
    expect(html).toContain(copy.sellerLabel);
    expect(html).toContain(`dir="${lang === "he" ? "rtl" : "ltr"}"`);
    expect(html).toContain(`lang="${lang}"`);
    for (const item of product.includedItems) {
      expect(html).toContain(item[lang]);
    }
    for (const alt of copy.includedImageAlts) {
      expect(html).toContain(`alt="${alt}"`);
    }
    expect(html).not.toContain("undefined");
  });

  it.each([
    ["ru", "R2jlbxceyVI"],
    ["en", "opM6GSS7rdI"],
    ["he", "opM6GSS7rdI"],
  ] as const)("maps the %s presentation to video %s without mounting YouTube initially", (lang, videoId) => {
    const media = getSoundCaseVideoPresentationMedia(lang);
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang }));

    expect(media.videoId).toBe(videoId);
    expect(media.posterUrl).toBe(`https://i.ytimg.com/vi/${videoId}/oar2.jpg`);
    expect(media.embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`);
    expect(html).toContain(media.posterUrl.replaceAll("&", "&amp;"));
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube-nocookie.com/embed");
    expect(html).not.toContain("autoplay=1");
  });

  it("places the video presentation between the hero and the quest introduction", () => {
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang: "en" }));
    const heroIndex = html.indexOf("sound-case-product__hero");
    const videoIndex = html.indexOf("sound-case-product__video sound-case-product__section");
    const introIndex = html.indexOf("sound-case-product__intro sound-case-product__section");

    expect(heroIndex).toBeGreaterThanOrEqual(0);
    expect(videoIndex).toBeGreaterThan(heroIndex);
    expect(introIndex).toBeGreaterThan(videoIndex);
  });

  it("renders the six inclusion previews in catalog order with lazy loading", () => {
    const html = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang: "en" }));

    expect(product.includedItems).toHaveLength(6);
    expect(SOUND_CASE_PRODUCT_INCLUDED_MEDIA).toHaveLength(6);
    for (const imageUrl of SOUND_CASE_PRODUCT_INCLUDED_MEDIA) {
      expect(html).toContain(`src="${imageUrl.replaceAll("&", "&amp;")}"`);
    }
    expect(html.match(/sound-case-product__included-media/g)).toHaveLength(6);
    expect(html.match(/loading="lazy"/g)?.length).toBeGreaterThanOrEqual(6);
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
    expect(html).toContain("collectible-cards/assets/parrot-way.webp");
    expect(html).toContain("sound-case-product__reuse-media");
    expect(html).not.toContain(">↺<");
    expect(html).toContain("browser");
    expect(html).toContain(product.recommendedAge?.en ?? "missing age");
    expect(html).toContain(product.duration?.en ?? "missing duration");
    expect(html).toContain("mostly independently");
    expect(html).not.toMatch(/\b1[–-]9 players\b|solo/i);
    expect(html).not.toContain("60–90 minutes after printing");
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
    expect(css).toMatch(/\.sound-case-product__included-media\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*2/s);
    expect(css).toMatch(/\.sound-case-product__included-media img\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toMatch(/\.sound-case-product__reuse-media img\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toMatch(/\.sound-case-product__video-frame\s*\{[^}]*aspect-ratio:\s*9\s*\/\s*16/s);
    expect(css).toMatch(/\.sound-case-product__video-poster img\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toMatch(/\.sound-case-product__reuse\s*\{[^}]*grid-template-columns:\s*minmax\(0, 40fr\) minmax\(0, 60fr\)/s);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.sound-case-product__reuse\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toContain("aspect-ratio: 16 / 10");
  });
});
