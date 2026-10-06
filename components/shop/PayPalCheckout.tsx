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
  type PayPalResumeResponse,
} from "@/lib/shop/paypalCheckout";
import { paypalCheckoutCopy } from "@/lib/shop/paypalCheckoutCopy";
import {
  clearPayPalCheckoutKey,
  getOrCreatePayPalCheckoutKey,
} from "@/lib/shop/paypalCheckoutSession";
import type { CustomerBillingIdentityResponse } from "@/lib/customer/billingIdentity";

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

type CheckoutState =
  | "loading"
  | "ready"
  | "opening"
  | "capturing"
  | "recovery"
  | "reconciling"
  | "needs_reconciliation"
  | "cancelled"
  | "error"
  | "success";
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
  const [billingIdentity, setBillingIdentity] = useState<CustomerBillingIdentityResponse | null>(null);
  const [billingName, setBillingName] = useState("");
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingError, setBillingError] = useState(false);
  const [identityRevision, setIdentityRevision] = useState(0);
  const [paypalEnvironment, setPayPalEnvironment] = useState<"sandbox" | "live" | null>(null);
  const activeOrderRef = useRef<{ localOrderId: string; paypalOrderId: string } | null>(null);
  const checkoutOutcomeHandledRef = useRef(false);
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

  const reconcileActiveOrder = useCallback(async () => {
    const activeOrder = activeOrderRef.current;
    if (!activeOrder || auth.status !== "authenticated") {
      setState("recovery");
      return;
    }
    setState("reconciling");
    try {
      const response = await authenticatedFetch("/api/customer/checkout/paypal/capture", activeOrder);
      const result = await readJson<PayPalCaptureResponse>(response);
      if (!response.ok || !result.ok || result.status !== "paid") throw new Error("Reconciliation failed");
      if (paypalEnvironment) clearPayPalCheckoutKey(window.sessionStorage, auth.session.user.id, paypalEnvironment);
      setState("success");
    } catch {
      setState("recovery");
    }
  }, [auth, authenticatedFetch, paypalEnvironment]);

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
      authenticatedFetch("/api/customer/checkout/paypal/resume", { productId: PAYPAL_CHECKOUT_PRODUCT_ID })
        .then((response) => readJson<PayPalResumeResponse>(response)),
      fetch("/api/customer/billing-identity", {
        headers: { Authorization: `Bearer ${auth.session.access_token}` }, cache: "no-store",
      }).then((response) => readJson<CustomerBillingIdentityResponse>(response)),
    ]).then(async ([config, resolvedQuote, resume, identity]) => {
      if (!active || !config.ok || !resolvedQuote.ok || !resume.ok) throw new Error("Checkout unavailable");
      setQuote(resolvedQuote);
      setPayPalEnvironment(config.environment);
      setBillingIdentity(identity);
      setBillingName(identity.billingName ?? "");
      if (resolvedQuote.status === "already_owned" || resume.status === "already_owned") {
        setState("ready");
        return;
      }
      if (resume.status === "needs_reconciliation") {
        setState("needs_reconciliation");
        return;
      }
      if (resume.status === "resumable") {
        setQuote({
          ok: true,
          status: "priced",
          productId: PAYPAL_CHECKOUT_PRODUCT_ID,
          amountMinor: resume.amountMinor,
          currency: resume.currency,
          priceSource: resume.priceSource,
        });
      }
      if (resume.status === "resumable" && resume.paypalOrderId) {
        activeOrderRef.current = {
          localOrderId: resume.localOrderId,
          paypalOrderId: resume.paypalOrderId,
        };
        if (resume.lifecycle === "capture_pending") {
          setState("recovery");
          return;
        }
      }

      if (!identity.complete) {
        setPaymentSession(null);
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
          await reconcileActiveOrder();
        },
        onCancel: () => setState("cancelled"),
        onError: () => {
          if (!checkoutOutcomeHandledRef.current) setState("error");
        },
      });
      if (!active) return;
      setPaymentSession(session);
      setState("ready");
    }).catch(() => {
      if (active) setState("error");
    });

    return () => { active = false; };
  }, [auth, authenticatedFetch, identityRevision, lang, reconcileActiveOrder]);

  const saveBillingIdentity = async () => {
    if (auth.status !== "authenticated") return;
    setBillingSaving(true); setBillingError(false);
    try {
      const response = await fetch("/api/customer/billing-identity", {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ billingName }),
      });
      if (!response.ok) throw new Error("Billing identity rejected");
      setBillingIdentity(await readJson<CustomerBillingIdentityResponse>(response));
      setIdentityRevision((value) => value + 1);
    } catch { setBillingError(true); } finally { setBillingSaving(false); }
  };

  const startCheckout = async () => {
    if (!paymentSession || auth.status !== "authenticated" || !paypalEnvironment) return;
    setState("opening");
    checkoutOutcomeHandledRef.current = false;
    const checkoutIdempotencyKey = getOrCreatePayPalCheckoutKey(
      window.sessionStorage,
      auth.session.user.id,
      paypalEnvironment,
      () => crypto.randomUUID(),
    );

    const orderPromise = authenticatedFetch("/api/customer/checkout/paypal/create", {
      productId: PAYPAL_CHECKOUT_PRODUCT_ID,
      checkoutIdempotencyKey,
    }).then(async (response) => {
      const result = await readJson<PayPalCreateResponse>(response);
      if (!response.ok || !result.ok) {
        throw new Error("Create order failed");
      }
      if (result.status === "needs_reconciliation") {
        checkoutOutcomeHandledRef.current = true;
        setState("needs_reconciliation");
        throw new Error("Checkout reconciliation required");
      }
      if (result.status === "reconcile_required") {
        activeOrderRef.current = {
          localOrderId: result.localOrderId,
          paypalOrderId: result.paypalOrderId,
        };
        checkoutOutcomeHandledRef.current = true;
        setState("recovery");
        throw new Error("Checkout recovery required");
      }
      if (result.status === "already_owned") {
        checkoutOutcomeHandledRef.current = true;
        clearPayPalCheckoutKey(window.sessionStorage, auth.session.user.id, paypalEnvironment);
        setState("success");
        throw new Error("Product already owned");
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
      if (!checkoutOutcomeHandledRef.current) setState("error");
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
      recoveryOrderReference={activeOrderRef.current?.localOrderId.slice(0, 8) ?? null}
      billingIdentity={billingIdentity}
      billingName={billingName}
      billingSaving={billingSaving}
      billingError={billingError}
      onBillingNameChange={(value) => { setBillingName(value); setBillingError(false); }}
      onBillingSave={() => void saveBillingIdentity()}
      onStart={() => void startCheckout()}
      onRetry={() => {
        if (state === "recovery") void reconcileActiveOrder();
        else void startCheckout();
      }}
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
  recoveryOrderReference,
  billingIdentity, billingName, billingSaving, billingError, onBillingNameChange, onBillingSave,
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
  recoveryOrderReference: string | null;
  billingIdentity: CustomerBillingIdentityResponse | null;
  billingName: string;
  billingSaving: boolean;
  billingError: boolean;
  onBillingNameChange: (value: string) => void;
  onBillingSave: () => void;
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

  if (billingIdentity && !billingIdentity.complete) {
    return (
      <section className="paypal-checkout__panel paypal-checkout__billing">
        <h2>{copy.billingTitle}</h2>
        <p>{copy.billingHelp}</p>
        <label htmlFor="checkout-billing-name">{copy.billingNameLabel}</label>
        <input id="checkout-billing-name" value={billingName} maxLength={160} autoComplete="name"
          onChange={(event) => onBillingNameChange(event.target.value)} />
        <label>{copy.billingEmailLabel}</label>
        <input value={billingIdentity.email} readOnly aria-readonly="true" />
        <button className="paypal-checkout__primary" type="button" disabled={billingSaving} onClick={onBillingSave}>
          {billingSaving ? copy.billingSaving : copy.billingSave}
        </button>
        {billingError ? <p role="alert">{copy.billingError}</p> : null}
      </section>
    );
  }

  if (state === "needs_reconciliation") {
    return (
      <section className="paypal-checkout__panel paypal-checkout__panel--error" role="alert">
        <h2>{copy.reconciliationTitle}</h2>
        <p>{copy.reconciliationBody}</p>
      </section>
    );
  }

  if (state === "recovery" || state === "reconciling") {
    return (
      <section className="paypal-checkout__panel" aria-live="polite">
        <h2>{copy.checkingPaymentTitle}</h2>
        <p>{copy.checkingPaymentBody}</p>
        {recoveryOrderReference ? <p>{copy.orderReference}: {recoveryOrderReference}</p> : null}
        <button
          className="paypal-checkout__primary"
          type="button"
          disabled={state === "reconciling"}
          onClick={onRetry}
        >
          {state === "reconciling" ? copy.loading : copy.checkPayment}
        </button>
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
