import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SoundCasePromoBanner } from "@/components/shop/SoundCasePromoBanner";
import { dictionaries } from "@/i18n";
import { SOUND_CASE_PROMO_MEDIA } from "@/lib/shop/soundCasePromoMedia";

describe("Sound Case promotional visuals", () => {
  it.each(["ru", "en", "he"] as const)("renders localized homepage promo copy and route for %s", (lang) => {
    const html = renderToStaticMarkup(createElement(SoundCasePromoBanner, { lang }));
    const copy = dictionaries[lang].home.soundCasePromo;

    expect(html).toContain(copy.eyebrow);
    expect(html).toContain(copy.title);
    expect(html).toContain(copy.hook);
    expect(html).toContain(copy.imageAlt);
    expect(html).toContain("49 ₪");
    expect(html).toContain("39 ₪");
    expect(html).toContain(lang === "ru"
      ? 'href="/shop/sound-case-001/preorder"'
      : `href="/${lang}/shop/sound-case-001/preorder"`);
  });

  it("uses the public R2 banner and sticker collections", () => {
    expect(SOUND_CASE_PROMO_MEDIA.banners.horizontal).toContain(
      "/quests/sound-case-001/banners/sound-case-001-banners/banner-horizontal.webp",
    );
    expect(SOUND_CASE_PROMO_MEDIA.banners.square).toContain("banner-square.webp");
    expect(SOUND_CASE_PROMO_MEDIA.banners.vertical).toContain("banner-vertical.webp");
    expect(Object.values(SOUND_CASE_PROMO_MEDIA.stickers).every((url) =>
      url.startsWith("https://media.laplapla.com/stickers/singing-dune-stickers/"),
    )).toBe(true);
  });

  it("keeps stickers decorative and gives the campaign image localized alt text", () => {
    const html = renderToStaticMarkup(createElement(SoundCasePromoBanner, { lang: "en" }));
    expect(html.match(/alt=""/g)).toHaveLength(2);
    expect(html).toContain(`alt="${dictionaries.en.home.soundCasePromo.imageAlt}"`);
  });

  it("uses the vertical poster on preorder without changing its SEO route", () => {
    const page = readFileSync(`${process.cwd()}/pages/shop/[slug]/preorder.tsx`, "utf8");
    expect(page).toContain("SOUND_CASE_PROMO_MEDIA.banners.vertical");
    expect(page).toContain("alt={copy.posterAlt}");
    expect(page).toContain('path={`/shop/${slug}/preorder`}');
    expect(page).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(page).not.toContain("preorder-page__rings");
  });

  it("defines equivalent campaign copy in all locales", () => {
    for (const lang of ["ru", "en", "he"] as const) {
      const home = dictionaries[lang].home.soundCasePromo;
      const preorder = dictionaries[lang].shop.soundCase.preorder;
      expect(Object.values(home).every(Boolean)).toBe(true);
      expect(preorder.adventureTitle).toBeTruthy();
      expect(preorder.hook).toBeTruthy();
      expect(preorder.posterAlt).toBeTruthy();
    }
  });
});
