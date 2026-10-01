import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { formatPrice } from "@/lib/shop/commerce";
import {
  PAYPAL_CHECKOUT_PRODUCT_ID,
  type PayPalCaptureResponse,
  type PayPalCreateResponse,
  type PayPalPublicConfigResponse,
  type PayPalQuoteResponse,
} from "@/lib/shop/paypalCheckout";
import { paypalCheckoutCopy } from "@/lib/shop/paypalCheckoutCopy";

type PayPalApprovalData = { orderId?: unknown };
type PayPalPaymentSession = {
  start: (
    options: { presentationMode: "auto" },
    orderPromise: Promise<{ orderId: string }>,
  ) => Promise<void>;
};
type PayPalSdkInstance = {
  findEligibleMethods: (input: { currencyCode: string }) => Promise<{ isEligible: (method: string) => boolean }>;
  createPayPalOneTimePaymentSession: (input: {
    onApprove: (data: PayPalApprovalData) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }) => PayPalPaymentSession;
};

declare global {
  interface Window {
    paypal?: {
      createInstance: (input: {
        clientId: string;
        components: string[];
        pageType: "checkout";
        locale: string;
      }) => Promise<PayPalSdkInstance>;
    };
  }
}

type CheckoutState = "loading" | "ready" | "opening" | "capturing" | "cancelled" | "error" | "success";
type SuccessfulQuote = Extract<PayPalQuoteResponse, { ok: true }>;

const localeByLang: Record<Lang, string> = { ru: "ru-RU", en: "en-US", he: "he-IL" };

function loadPayPalSdk(environment: "sandbox" | "live") {
  if (window.paypal) return Promise.resolve();
  const src = environment === "sandbox"
    ? "https://www.sandbox.paypal.com/web-sdk/v6/core"
    : "https://www.paypal.com/web-sdk/v6/core";

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-laplapla-paypal-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("PayPal SDK failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.laplaplaPaypalSdk = environment;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("PayPal SDK failed to load")), { once: true });
    document.head.appendChild(script);
  });
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export function PayPalCheckout({ lang }: { lang: Lang }) {
  const auth = useCustomerSession();
  const [state, setState] = useState<CheckoutState>("loading");
  const [quote, setQuote] = useState<SuccessfulQuote | null>(null);
  const [paymentSession, setPaymentSession] = useState<PayPalPaymentSession | null>(null);
  const activeOrderRef = useRef<{ localOrderId: string; paypalOrderId: string } | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const createPath = buildLocalizedPublicPath("/shop/sound-case-001/create", lang);
  const checkoutPath = buildLocalizedPublicPath("/shop/sound-case-001/checkout", lang);
  const signInPath = `${buildLocalizedPublicPath("/account/sign-in", lang)}?next=${encodeURIComponent(checkoutPath)}`;

  const authenticatedFetch = useCallback(async (url: string, body: unknown) => {
    if (auth.status !== "authenticated") throw new Error("Authentication required");
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }, [auth]);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (auth.status !== "authenticated") {
      setState("ready");
      setQuote(null);
      setPaymentSession(null);
      return;
    }

    let active = true;
    setState("loading");
    void Promise.all([
      fetch("/api/shop/paypal/config", { cache: "no-store" }).then((response) => readJson<PayPalPublicConfigResponse>(response)),
      authenticatedFetch("/api/customer/checkout/paypal/quote", { productId: PAYPAL_CHECKOUT_PRODUCT_ID })
        .then((response) => readJson<PayPalQuoteResponse>(response)),
    ]).then(async ([config, resolvedQuote]) => {
      if (!active || !config.ok || !resolvedQuote.ok) throw new Error("Checkout unavailable");
      setQuote(resolvedQuote);
      if (resolvedQuote.status === "already_owned") {
        setState("ready");
        return;
      }

      await loadPayPalSdk(config.environment);
      if (!active || !window.paypal) throw new Error("PayPal SDK unavailable");
      const sdk = await window.paypal.createInstance({
        clientId: config.clientId,
        components: ["paypal-payments"],
        pageType: "checkout",
        locale: localeByLang[lang],
      });
      const methods = await sdk.findEligibleMethods({ currencyCode: resolvedQuote.currency });
      if (!methods.isEligible("paypal")) throw new Error("PayPal is not eligible");

      const session = sdk.createPayPalOneTimePaymentSession({
        onApprove: async (data) => {
          const activeOrder = activeOrderRef.current;
          if (!activeOrder || data.orderId !== activeOrder.paypalOrderId) {
            setState("error");
            return;
          }
          setState("capturing");
          try {
            const response = await authenticatedFetch("/api/customer/checkout/paypal/capture", activeOrder);
            const result = await readJson<PayPalCaptureResponse>(response);
            if (!response.ok || !result.ok || result.status !== "paid") throw new Error("Capture failed");
            setState("success");
          } catch {
            setState("error");
          }
        },
        onCancel: () => setState("cancelled"),
        onError: () => setState("error"),
      });
      if (!active) return;
      setPaymentSession(session);
      setState("ready");
    }).catch(() => {
      if (active) setState("error");
    });

    return () => { active = false; };
  }, [auth, authenticatedFetch, lang]);

  const startCheckout = async () => {
    if (!paymentSession || auth.status !== "authenticated") return;
    setState("opening");
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    const orderPromise = authenticatedFetch("/api/customer/checkout/paypal/create", {
      productId: PAYPAL_CHECKOUT_PRODUCT_ID,
      checkoutIdempotencyKey: idempotencyKeyRef.current,
    }).then(async (response) => {
      const result = await readJson<PayPalCreateResponse>(response);
      if (!response.ok || !result.ok || result.status !== "pending_approval") {
        throw new Error("Create order failed");
      }
      activeOrderRef.current = {
        localOrderId: result.localOrderId,
        paypalOrderId: result.paypalOrderId,
      };
      return { orderId: result.paypalOrderId };
    });

    try {
      await paymentSession.start({ presentationMode: "auto" }, orderPromise);
    } catch {
      setState("error");
    }
  };

  return (
    <PayPalCheckoutView
      lang={lang}
      authStatus={auth.status}
      state={state}
      quote={quote}
      paymentReady={Boolean(paymentSession)}
      signInPath={signInPath}
      createPath={createPath}
      onStart={() => void startCheckout()}
      onRetry={() => window.location.reload()}
    />
  );
}

export function PayPalCheckoutView({
  lang,
  authStatus,
  state,
  quote,
  paymentReady,
  signInPath,
  createPath,
  onStart,
  onRetry,
}: {
  lang: Lang;
  authStatus: "loading" | "anonymous" | "authenticated" | "error";
  state: CheckoutState;
  quote: SuccessfulQuote | null;
  paymentReady: boolean;
  signInPath: string;
  createPath: string;
  onStart: () => void;
  onRetry: () => void;
}) {
  const copy = paypalCheckoutCopy[lang];
  if (authStatus === "loading" || state === "loading") {
    return <p className="paypal-checkout__status" aria-live="polite">{copy.loading}</p>;
  }

  if (authStatus !== "authenticated") {
    return (
      <section className="paypal-checkout__panel">
        <h2>{copy.signInTitle}</h2>
        <p>{copy.signInBody}</p>
        <Link className="paypal-checkout__primary" href={signInPath}>{copy.signIn}</Link>
      </section>
    );
  }

  if (quote?.status === "already_owned" || state === "success") {
    return (
      <section className="paypal-checkout__panel paypal-checkout__panel--success" aria-live="polite">
        <h2>{state === "success" ? copy.successTitle : copy.ownedTitle}</h2>
        <p>{state === "success" ? copy.successBody : copy.ownedBody}</p>
        <Link className="paypal-checkout__primary" href={createPath}>{copy.openBuilder}</Link>
      </section>
    );
  }

  const pricedQuote = quote?.status === "priced" ? quote : null;
  return (
    <section className="paypal-checkout__panel">
      {pricedQuote ? (
        <div className="paypal-checkout__price">
          <span>{pricedQuote.priceSource === "preorder" ? copy.preorderPrice : copy.regularPrice}</span>
          <strong>{formatPrice(pricedQuote.amountMinor, pricedQuote.currency, lang)}</strong>
        </div>
      ) : null}
      <button
        className="paypal-checkout__paypal-button"
        type="button"
        disabled={!paymentReady || state === "opening" || state === "capturing"}
        onClick={onStart}
      >
        {state === "opening" || state === "capturing" ? copy.loading : copy.payWithPayPal}
      </button>
      <p className="paypal-checkout__secure-note">{copy.secureNote}</p>
      {state === "cancelled" ? <p role="status">{copy.cancelled}</p> : null}
      {state === "error" ? (
        <div role="alert" className="paypal-checkout__error">
          <p>{copy.unavailable}</p>
          <button type="button" onClick={onRetry}>{copy.retry}</button>
        </div>
      ) : null}
    </section>
  );
}
