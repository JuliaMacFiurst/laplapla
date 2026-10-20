import { readFileSync } from "node:fs";
import { Children, createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useCustomerSession", () => ({
  useCustomerSession: () => ({ status: "anonymous", session: null, error: null }),
}));
import { PayPalCheckoutView } from "@/components/shop/PayPalCheckout";
import { paypalCheckoutCopy } from "@/lib/shop/paypalCheckoutCopy";
import { checkoutConsentCopy } from "@/lib/legal/checkoutConsent";
import { formatPrice } from "@/lib/shop/commerce";

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
    recoveryOrderReference: null,
    legalAccepted: false,
    electronicReceiptAccepted: false,
    onLegalAcceptedChange: () => undefined,
    onElectronicReceiptAcceptedChange: () => undefined,
    onStart: () => undefined,
    onRetry: () => undefined,
    billingIdentity: { billingName: "Julia Example", email: "customer@example.com", complete: true },
    billingName: "Julia Example",
    billingSaving: false,
    billingError: false,
    onBillingNameChange: () => undefined,
    onBillingSave: () => undefined,
  };

  it.each(["ru", "en", "he"] as const)("requires two separate unchecked consents in %s", (lang) => {
    const html = renderToStaticMarkup(createElement(PayPalCheckoutView, { ...baseProps, lang, quote: null }));
    expect(html).toContain('id="checkout-legal-consent"');
    expect(html).toContain('id="checkout-electronic-receipt-consent"');
    expect(html).toContain(checkoutConsentCopy[lang].electronicReceipt);
    expect(html).toContain(`${lang === "ru" ? "" : `/${lang}`}/terms-of-sale`);
    expect(html).toContain(`${lang === "ru" ? "" : `/${lang}`}/refund-policy`);
    expect(html).toContain(`${lang === "ru" ? "" : `/${lang}`}/printable-license`);
    expect(html).toMatch(/class="paypal-checkout__paypal-button"[^>]*disabled=""/u);
    expect(html).not.toMatch(/id="checkout-(?:legal|electronic-receipt)-consent"[^>]*checked/u);
    if (lang === "he") expect(html).toContain('class="paypal-checkout__consents" dir="rtl"');
  });

  it.each(["ru", "en", "he"] as const)("starts checkout from the first payment click in %s", (lang) => {
    const onStart = vi.fn();
    const onRetry = vi.fn();
    const view = PayPalCheckoutView({
      ...baseProps,
      lang,
      quote: { ok: true, status: "priced", productId: "sound-case-001", amountMinor: 3900, currency: "ILS", priceSource: "catalog" },
      legalAccepted: true,
      electronicReceiptAccepted: true,
      onStart,
      onRetry,
    });
    if (!isValidElement<{ children: React.ReactNode }>(view)) throw new Error("Checkout view did not render");
    const button = Children.toArray(view.props.children).find((child) =>
      isValidElement<{ className?: string }>(child) && child.props.className === "paypal-checkout__paypal-button",
    );
    if (!isValidElement<{ disabled?: boolean; onClick?: () => void }>(button)) throw new Error("PayPal button missing");

    expect(button.props.disabled).toBe(false);
    button.props.onClick?.();
    expect(onStart).toHaveBeenCalledOnce();
    expect(onRetry).not.toHaveBeenCalled();
  });

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
    expect(preorder).toContain(paypalCheckoutCopy.en.launchOfferPrice);
    expect(preorder).toContain(paypalCheckoutCopy.en.savings);
    expect(preorder).toContain("49");
    expect(preorder).toContain("<s>");

    const catalog = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 4900, currency: "ILS", priceSource: "catalog",
      },
    }));
    expect(catalog).toContain("49");
    expect(catalog).toContain(paypalCheckoutCopy.en.price);
    expect(catalog).not.toContain(paypalCheckoutCopy.en.launchOfferPrice);
    expect(catalog).not.toContain("<s>");
  });

  it.each(["ru", "en", "he"] as const)("shows the quoted launch price and savings in %s", (lang) => {
    const html = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang, quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 3900, currency: "ILS", priceSource: "catalog",
      },
    }));
    const copy = paypalCheckoutCopy[lang];
    expect(html).toContain(copy.regularPrice);
    expect(html).toContain(copy.launchOfferPrice);
    expect(html).toContain(copy.savings);
    expect(html).toContain(formatPrice(4900, "ILS", lang));
    expect(html).toContain(formatPrice(3900, "ILS", lang));
    expect(html).toContain(formatPrice(1000, "ILS", lang));
    expect(html).toContain('<s><bdi dir="ltr">');
    expect(html).toContain('<strong><bdi dir="ltr">');
    if (lang === "he") expect(html).toContain('class="paypal-checkout__price paypal-checkout__price--offer" dir="rtl"');
  });

  it("uses the resumed order quote without claiming a different offer", () => {
    const html = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 4900, currency: "ILS", priceSource: "catalog",
      },
    }));
    expect(html).toContain(formatPrice(4900, "ILS", "en"));
    expect(html).not.toContain(paypalCheckoutCopy.en.savings);
    expect(html).not.toContain('paypal-checkout__price--offer');
  });

  it("does not show an unconfirmed amount while the quote is loading", () => {
    const html = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "en", state: "loading", quote: null,
    }));
    expect(html).toContain(paypalCheckoutCopy.en.loading);
    expect(html).not.toContain('paypal-checkout__price');
    expect(html).not.toContain(paypalCheckoutCopy.en.payWithPayPal);
  });

  it.each(["ru", "en", "he"] as const)("collects missing billing identity in %s before PayPal", (lang) => {
    const html = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang, quote: null,
      billingIdentity: { billingName: null, email: "verified@example.com", complete: false },
      billingName: "",
    }));
    expect(html).toContain(paypalCheckoutCopy[lang].billingTitle);
    expect(html).toContain("verified@example.com");
    expect(html).not.toContain(paypalCheckoutCopy[lang].payWithPayPal);
    if (lang === "he") expect(paypalCheckoutCopy.he.billingTitle).toContain("שם");
  });

  it("renders an existing entitlement without claiming a new purchase", () => {
    const owned = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "ru", quote: { ok: true, status: "already_owned", productId: "sound-case-001" },
    }));
    expect(owned).toContain(paypalCheckoutCopy.ru.ownedTitle);
    expect(owned).toContain("/en/shop/sound-case-001/create");

    const ownedAfterCreate = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang: "he", state: "owned", quote: null,
    }));
    expect(ownedAfterCreate).toContain(paypalCheckoutCopy.he.ownedTitle);
    expect(ownedAfterCreate).toContain(paypalCheckoutCopy.he.openBuilder);
    expect(ownedAfterCreate).not.toContain(paypalCheckoutCopy.he.successTitle);
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

  it.each(["ru", "en", "he"] as const)("renders a safe payment recovery state for %s", (lang) => {
    const recovery = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps,
      lang,
      state: "recovery",
      recoveryOrderReference: "abcd1234",
      quote: {
        ok: true, status: "priced", productId: "sound-case-001",
        amountMinor: 3900, currency: "ILS", priceSource: "preorder",
      },
    }));
    expect(recovery).toContain(paypalCheckoutCopy[lang].checkingPaymentTitle);
    expect(recovery).toContain(paypalCheckoutCopy[lang].checkingPaymentBody);
    expect(recovery).toContain("abcd1234");
    expect(recovery).not.toContain(paypalCheckoutCopy[lang].payWithPayPal);
  });

  it("blocks another payment when multiple orders need reconciliation", () => {
    const ambiguous = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps,
      lang: "en",
      state: "needs_reconciliation",
      quote: null,
    }));
    expect(ambiguous).toContain(paypalCheckoutCopy.en.reconciliationTitle);
    expect(ambiguous).not.toContain(paypalCheckoutCopy.en.payWithPayPal);
  });

  it("keeps checkout noindex, locale-aware and Hebrew RTL", () => {
    const page = readFileSync(`${process.cwd()}/pages/shop/[slug]/checkout.tsx`, "utf8");
    const component = readFileSync(`${process.cwd()}/components/shop/PayPalCheckout.tsx`, "utf8");
    expect(page).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(page).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(page).toContain("isPayPalCheckoutAvailable(config)");
    expect(component).toContain("buildLocalizedPublicPath");
    expect(component).toContain('/account/sign-in');
    expect(component).toContain('/shop/sound-case-001/create');
  });

  it.each(["ru", "en", "he"] as const)("uses real-payment wording for Live checkout in %s", (lang) => {
    const html = renderToStaticMarkup(createElement(PayPalCheckoutView, {
      ...baseProps, lang, environment: "live", quote: null,
    }));
    expect(html).toContain(paypalCheckoutCopy[lang].payWithPayPalLive);
    expect(html).not.toContain(paypalCheckoutCopy[lang].payWithPayPal);
    expect(paypalCheckoutCopy[lang].liveIntro).not.toContain("Sandbox");
    expect(paypalCheckoutCopy[lang].liveBadge).not.toContain("Sandbox");
  });

  it("uses the official v6 hosted approval session and never embeds the secret", () => {
    const component = readFileSync(`${process.cwd()}/components/shop/PayPalCheckout.tsx`, "utf8");
    expect(component).toContain("/web-sdk/v6/core");
    expect(component).toContain("createPayPalOneTimePaymentSession");
    expect(component).toContain('presentationMode: "auto"');
    expect(component).not.toContain("PAYPAL_CLIENT_SECRET");
    expect(component).not.toContain("captureId:");
    expect(component).not.toContain("window.location.reload");
  });
});
