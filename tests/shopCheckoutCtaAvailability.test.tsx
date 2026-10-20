import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GetServerSidePropsContext } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/homeRetention", () => ({ loadHomepageRetentionData: vi.fn().mockResolvedValue({}) }));
vi.mock("@/hooks/useCustomerSession", () => ({ useCustomerSession: () => ({ status: "anonymous", session: null, error: null }) }));

import { SoundCasePromoBanner } from "@/components/shop/SoundCasePromoBanner";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { ShopProductDetail } from "@/components/shop/ShopProductDetail";
import { getProductById } from "@/lib/shop/catalog";
import { LAUNCH_OFFER_COPY } from "@/lib/shop/launchOffer";
import { getShopCheckoutAvailability } from "@/lib/server/commerce/paypal/checkoutAvailability";
import { getServerSideProps as homeProps } from "@/pages/index";
import { getServerSideProps as shopProps } from "@/pages/shop/index";
import { getServerSideProps as productProps } from "@/pages/shop/[slug]";
import { PurchaseSuccessView, getServerSideProps as successProps } from "@/pages/shop/[slug]/success";

const product = getProductById("sound-case-001");
if (!product) throw new Error("Sound Case #001 fixture missing");

function configureLive(enabled: boolean) {
  vi.stubEnv("PAYPAL_ENVIRONMENT", "live");
  vi.stubEnv("PAYPAL_CLIENT_ID", "public-test-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "server-only-test-secret");
  vi.stubEnv("SHOP_LIVE_CHECKOUT_ENABLED", String(enabled));
  vi.stubEnv("RECEIPT_ORIGINAL_EMAIL_ENABLED", "true");
  vi.stubEnv("RESEND_API_KEY", "server-only-test-resend-key");
  vi.stubEnv("RESEND_FROM_EMAIL", "LapLapLa <support@example.test>");
  vi.stubEnv("RECEIPT_PDF_STORAGE_BUCKET", "receipt-pdfs");
}

afterEach(() => vi.unstubAllEnvs());

describe("public Shop checkout availability", () => {
  it.each(["ru", "en", "he"] as const)("shows %s Coming soon without a checkout link while Live is closed", (lang) => {
    configureLive(false);
    const card = renderToStaticMarkup(createElement(ShopProductCard, { product, lang, checkoutAvailable: getShopCheckoutAvailability() }));
    const detail = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang, checkoutAvailable: getShopCheckoutAvailability() }));
    const promo = renderToStaticMarkup(createElement(SoundCasePromoBanner, { lang, checkoutAvailable: getShopCheckoutAvailability() }));
    const soon = LAUNCH_OFFER_COPY[lang].comingSoon;

    for (const html of [card, detail, promo]) {
      expect(html.replace(/[\u2066-\u2069]/g, "")).toContain(product.title[lang]);
      expect(html).toContain(soon);
      expect(html).not.toContain(`/shop/sound-case-001/checkout`);
      expect(html).not.toContain(`/shop/sound-case-001/preorder`);
    }
    expect(detail.match(/role="status"/g)).toHaveLength(2);
    expect(promo).toContain('role="status"');
    expect(product.status).toBe("active");
  });

  it.each(["ru", "en", "he"] as const)("restores the %s purchase CTA when the server allows Live", (lang) => {
    configureLive(true);
    const detail = renderToStaticMarkup(createElement(ShopProductDetail, { product, lang, checkoutAvailable: getShopCheckoutAvailability() }));
    const promo = renderToStaticMarkup(createElement(SoundCasePromoBanner, { lang, checkoutAvailable: getShopCheckoutAvailability() }));
    const checkoutPath = lang === "ru" ? "/shop/sound-case-001/checkout" : `/${lang}/shop/sound-case-001/checkout`;

    expect(detail).toContain(`href="${checkoutPath}"`);
    expect(promo).toContain(`href="${checkoutPath}"`);
    expect(detail).toContain(LAUNCH_OFFER_COPY[lang].buy);
    expect(promo).toContain(LAUNCH_OFFER_COPY[lang].buy);
    expect(detail).not.toContain('role="status"');
  });

  it("passes only a server-derived boolean to the homepage, Shop, product, and success pages", async () => {
    const productContext = { params: { slug: "sound-case-001" } } as unknown as GetServerSidePropsContext;
    for (const enabled of [false, true]) {
      configureLive(enabled);
      const results = await Promise.all([
        homeProps({ locale: "he" } as GetServerSidePropsContext),
        shopProps({} as GetServerSidePropsContext),
        productProps(productContext),
        successProps(productContext),
      ]);
      for (const result of results) {
        expect(result).toMatchObject({ props: { checkoutAvailable: enabled } });
        expect(JSON.stringify(result)).not.toContain("server-only-test-secret");
        expect(JSON.stringify(result)).not.toContain("server-only-test-resend-key");
      }
    }
  });

  it("keeps Sandbox available independently of the Live flag and fails closed without configuration", () => {
    configureLive(false);
    vi.stubEnv("PAYPAL_ENVIRONMENT", "sandbox");
    expect(getShopCheckoutAvailability()).toBe(true);
    vi.stubEnv("PAYPAL_ENVIRONMENT", "live");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "");
    expect(getShopCheckoutAvailability()).toBe(false);
  });

  it("does not link an unconfirmed purchase to a closed checkout", () => {
    configureLive(false);
    const closed = renderToStaticMarkup(createElement(PurchaseSuccessView, {
      lang: "en", state: "unconfirmed", authStatus: "authenticated", checkoutAvailable: false, onCheckAgain: () => {},
    }));
    const open = renderToStaticMarkup(createElement(PurchaseSuccessView, {
      lang: "en", state: "unconfirmed", authStatus: "authenticated", checkoutAvailable: true, onCheckAgain: () => {},
    }));
    expect(closed).not.toContain("/shop/sound-case-001/checkout");
    expect(open).toContain('href="/en/shop/sound-case-001/checkout"');
  });
});
