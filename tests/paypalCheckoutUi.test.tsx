import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useCustomerSession", () => ({
  useCustomerSession: () => ({ status: "anonymous", session: null, error: null }),
}));
import { PayPalCheckoutView } from "@/components/shop/PayPalCheckout";
import { paypalCheckoutCopy } from "@/lib/shop/paypalCheckoutCopy";

describe("localized PayPal Sandbox checkout UI", () => {
  it.each(["ru", "en", "he"] as const)("has complete checkout copy for %s", (lang) => {
    const copy = paypalCheckoutCopy[lang];
    expect(copy.title).toContain("001");
    expect(copy.payWithPayPal).toContain("PayPal Sandbox");
    expect(copy.successTitle).toBeTruthy();
    expect(copy.openBuilder).toBeTruthy();
  });

  const baseProps = {
    authStatus: "authenticated" as const,
    state: "ready" as const,
    paymentReady: true,
    signInPath: "/en/account/sign-in?next=%2Fen%2Fshop%2Fsound-case-001%2Fcheckout",
    createPath: "/en/shop/sound-case-001/create",
    onStart: () => undefined,
    onRetry: () => undefined,
  };

  it("renders unauthenticated sign-in and server-resolved 39/49 prices", () => {
    const anonymous = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", authStatus: "anonymous", quote: null,
    }));
    expect(anonymous).toContain(paypalCheckoutCopy.en.signIn);
    expect(anonymous).toContain("/en/account/sign-in");

    const preorder = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 3900, currency: "ILS", priceSource: "preorder",
      },
    }));
    expect(preorder).toContain("39");
    expect(preorder).toContain(paypalCheckoutCopy.en.preorderPrice);

    const catalog = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 4900, currency: "ILS", priceSource: "catalog",
      },
    }));
    expect(catalog).toContain("49");
    expect(catalog).toContain(paypalCheckoutCopy.en.regularPrice);
  });

  it("renders owned and paid-success states with the personalization CTA", () => {
    const owned = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "ru", quote: { ok: true, status: "already_owned", productId: "sound-case-001" },
    }));
    expect(owned).toContain(paypalCheckoutCopy.ru.ownedTitle);
    expect(owned).toContain("/en/shop/sound-case-001/create");

    const success = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "he", state: "success", quote: null,
    }));
    expect(success).toContain(paypalCheckoutCopy.he.successTitle);
    expect(success).toContain(paypalCheckoutCopy.he.openBuilder);
  });

  it("renders cancellation and failure without implying that payment succeeded", () => {
    const cancelled = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", state: "cancelled", quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 4900, currency: "ILS", priceSource: "catalog",
      },
    }));
    expect(cancelled).toContain(paypalCheckoutCopy.en.cancelled);
    expect(cancelled).not.toContain(paypalCheckoutCopy.en.successTitle);

    const failed = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "ru", state: "error", quote: null,
    }));
    expect(failed).toContain(paypalCheckoutCopy.ru.unavailable);
    expect(failed).toContain('role="alert"');
  });

  it("keeps checkout noindex, locale-aware and Hebrew RTL", () => {
    const page = readFileSync(`${process.cwd()}/pages/shop/[slug]/checkout.tsx`, "utf8");
    const component = readFileSync(`${process.cwd()}/components/shop/PayPalCheckout.tsx`, "utf8");
    expect(page).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(page).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(page).toContain('process.env.PAYPAL_ENVIRONMENT !== "sandbox"');
    expect(component).toContain("buildLocalizedPublicPath");
    expect(component).toContain('/account/sign-in');
    expect(component).toContain('/shop/sound-case-001/create');
  });

  it("uses the official v6 hosted approval session and never embeds the secret", () => {
    const component = readFileSync(`${process.cwd()}/components/shop/PayPalCheckout.tsx`, "utf8");
    expect(component).toContain("/web-sdk/v6/core");
    expect(component).toContain("createPayPalOneTimePaymentSession");
    expect(component).toContain('presentationMode: "auto"');
    expect(component).not.toContain("PAYPAL_CLIENT_SECRET");
    expect(component).not.toContain("captureId:");
  });
});
