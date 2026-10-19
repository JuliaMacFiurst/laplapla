import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { trackEventMock } = vi.hoisted(() => ({ trackEventMock: vi.fn() }));

vi.mock("@/lib/analytics/client", () => ({
  trackEvent: trackEventMock,
}));

import { SoundCasePromoBanner } from "@/components/shop/SoundCasePromoBanner";
import { ShopProductDetail } from "@/components/shop/ShopProductDetail";
import { trackProductInterest } from "@/lib/analytics/commerce";
import { parseCommerceAnalyticsReportV1 } from "@/lib/analytics/commerceReport";
import { getProductById } from "@/lib/shop/catalog";

const product = getProductById("sound-case-001");
if (!product) throw new Error("Sound Case catalog fixture is missing");

describe("commerce analytics client producers", () => {
  beforeEach(() => trackEventMock.mockReset());

  it("does not send product_interest while product and home promo components render", () => {
    renderToStaticMarkup(createElement(ShopProductDetail, { product, lang: "en" }));
    renderToStaticMarkup(createElement(SoundCasePromoBanner, { lang: "en" }));
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it.each([
    "product_hero",
    "product_final",
    "home_promo",
  ] as const)("sends one bounded event for one %s logical click without blocking navigation", (entryPoint) => {
    const result = trackProductInterest({
      productId: product.id,
      contentSlug: product.slug,
      language: "en",
      entryPoint,
    });
    expect(result).toBeUndefined();
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith("product_interest", {
      section: "shop",
      content_type: "shop_product",
      content_id: "sound-case-001",
      product_id: "sound-case-001",
      content_slug: "sound-case-001",
      language: "en",
      entry_point: entryPoint,
      destination: "checkout",
    });
  });

  it("wires exactly the three requested CTA entry points and keeps the existing product_view producer", () => {
    const detail = readFileSync(`${process.cwd()}/components/shop/ShopProductDetail.tsx`, "utf8");
    const promo = readFileSync(`${process.cwd()}/components/shop/SoundCasePromoBanner.tsx`, "utf8");
    const productPage = readFileSync(`${process.cwd()}/pages/shop/[slug].tsx`, "utf8");

    expect(detail.match(/entryPoint: "product_hero"/gu)).toHaveLength(1);
    expect(detail.match(/entryPoint: "product_final"/gu)).toHaveLength(1);
    expect(promo.match(/entryPoint: "home_promo"/gu)).toHaveLength(1);
    expect(`${detail}\n${promo}`).not.toContain("preventDefault");
    expect(productPage.match(/trackEvent\("product_view"/gu)).toHaveLength(1);
    expect(productPage).toContain("content_id: product?.id ?? slug");
  });

  it("accepts only the documented independent-count report contract", () => {
    const report = {
      version: 1,
      period: { from: "2026-10-19T00:00:00.000000Z", to: "2026-10-20T00:00:00.000000Z", timezone: "UTC", interval: "[from,to)" },
      environment: "sandbox",
      traffic_scope: "all_production",
      audience: {}, commerce: {}, attribution: {}, sources: {}, products: [],
      funnel: { mode: "independent_counts", conversion_percentages_available: false },
      data_quality: {},
    };
    expect(parseCommerceAnalyticsReportV1(report)).toBe(report);
    expect(() => parseCommerceAnalyticsReportV1({ ...report, funnel: { mode: "strict", conversion_percentages_available: true } })).toThrow("Unsafe commerce funnel semantics");
  });
});
