import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { customerCopy } from "@/lib/customer/copy";
import { resolveEntitledCatalogProducts } from "@/lib/customer/catalog";
import type { CustomerProfile, ProductEntitlement } from "@/lib/customer/types";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import type { CustomerBillingIdentityResponse } from "@/lib/customer/billingIdentity";

type AccountResponse = {
  profile: CustomerProfile | null;
  entitlements: ProductEntitlement[];
};

export default function CustomerAccountPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = customerCopy[lang];
  const auth = useCustomerSession();
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [billing, setBilling] = useState<CustomerBillingIdentityResponse | null>(null);
  const [billingName, setBillingName] = useState("");
  const [billingState, setBillingState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const products = useMemo(
    () => resolveEntitledCatalogProducts(account?.entitlements ?? [], lang),
    [account?.entitlements, lang],
  );

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setAccount(null);
      setAccountError(null);
      return;
    }

    const controller = new AbortController();
    setAccount(null);
    setAccountError(null);

    void Promise.all([fetch("/api/customer/account", {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      signal: controller.signal,
    }), fetch("/api/customer/billing-identity", {
      headers: { Authorization: `Bearer ${auth.session.access_token}` }, signal: controller.signal,
    })]).then(async ([response, billingResponse]) => {
        if (!response.ok) throw new Error(`Account request failed (${response.status})`);
        if (!billingResponse.ok) throw new Error(`Billing identity request failed (${billingResponse.status})`);
        return Promise.all([
          response.json() as Promise<AccountResponse>,
          billingResponse.json() as Promise<CustomerBillingIdentityResponse>,
        ]);
      })
      .then(([nextAccount, nextBilling]) => {
        setAccount(nextAccount); setBilling(nextBilling); setBillingName(nextBilling.billingName ?? "");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAccountError(error instanceof Error ? error.message : "Unable to load account");
        }
      });

    return () => controller.abort();
  }, [auth]);

  const accountPath = buildLocalizedPublicPath("/account", lang);
  const signInPath = `${buildLocalizedPublicPath("/account/sign-in", lang)}?next=${encodeURIComponent(accountPath)}`;
  const saveBillingName = async () => {
    if (auth.status !== "authenticated") return;
    setBillingState("saving");
    try {
      const response = await fetch("/api/customer/billing-identity", {
        method: "PUT",
        headers: { Authorization: `Bearer ${auth.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ billingName }),
      });
      if (!response.ok) throw new Error("Unable to save billing identity");
      const next = await response.json() as CustomerBillingIdentityResponse;
      setBilling(next); setBillingName(next.billingName ?? ""); setBillingState("saved");
    } catch { setBillingState("error"); }
  };

  return (
    <>
      <SEO
        title={`${copy.accountTitle} | LapLapLa`}
        description={copy.signInIntro}
        path={accountPath}
        noindex
      />
      <main className="customer-account" dir={lang === "he" ? "rtl" : "ltr"}>
        <section className="customer-account__panel">
          <h1>{copy.accountTitle}</h1>

          {auth.status === "loading" ? <p>{copy.loading}</p> : null}
          {auth.status === "error" ? <p role="alert">{auth.error}</p> : null}
          {auth.status === "anonymous" ? (
            <div className="customer-account__empty">
              <p>{copy.signInIntro}</p>
              <Link className="customer-account__primary" href={signInPath}>
                {copy.google}
              </Link>
            </div>
          ) : null}

          {auth.status === "authenticated" ? (
            <>
              <div className="customer-account__identity">
                <p><strong>{copy.signedInAs}:</strong> {auth.session.user.email ?? "—"}</p>
                {account?.profile ? (
                  <p>
                    <strong>{copy.memberSince}:</strong>{" "}
                    {new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(
                      new Date(account.profile.created_at),
                    )}
                  </p>
                ) : null}
                <Link href={buildLocalizedPublicPath("/account/sign-out", lang)}>
                  {copy.signOut}
                </Link>
              </div>

              {billing ? (
                <section className="customer-account__billing" aria-labelledby="billing-title">
                  <h2 id="billing-title">{copy.billingTitle}</h2>
                  <p>{copy.billingHelp}</p>
                  <label htmlFor="billing-name">{copy.billingNameLabel}</label>
                  <input id="billing-name" value={billingName} maxLength={160} autoComplete="name"
                    onChange={(event) => { setBillingName(event.target.value); setBillingState("idle"); }} />
                  <label>{copy.verifiedEmail}</label>
                  <input value={billing.email} readOnly aria-readonly="true" />
                  <button className="customer-account__primary" type="button" disabled={billingState === "saving"}
                    onClick={() => void saveBillingName()}>
                    {billingState === "saving" ? copy.billingSaving : copy.billingSave}
                  </button>
                  {billingState === "saved" ? <p role="status">{copy.billingSaved}</p> : null}
                  {billingState === "error" ? <p role="alert">{copy.retry}</p> : null}
                </section>
              ) : null}

              <h2>{copy.purchasesTitle}</h2>
              {!account && !accountError ? <p>{copy.loading}</p> : null}
              {accountError ? (
                <div role="alert" className="customer-account__empty">
                  <p>{accountError}</p>
                  <button type="button" onClick={() => void router.reload()}>{copy.retry}</button>
                </div>
              ) : null}
              {account && products.length === 0 ? (
                <p className="customer-account__empty">{copy.emptyPurchases}</p>
              ) : null}
              {products.length > 0 ? (
                <ul className="customer-account__products">
                  {products.map(({ entitlement, product, title, description }) => {
                    const active = entitlement.status === "active";
                    return (
                      <li key={entitlement.id}>
                        <div>
                          <span className={active ? "is-active" : "is-inactive"}>
                            {active ? copy.active : copy.unavailable}
                          </span>
                          <h3>{title}</h3>
                          <p>{description}</p>
                        </div>
                        <div className="customer-account__actions">
                          <Link href={buildLocalizedPublicPath(`/shop/${product.slug}`, lang)}>
                            {copy.openProduct}
                          </Link>
                          {active ? (
                            <Link
                              className="customer-account__primary"
                              href={buildLocalizedPublicPath(`/shop/${product.slug}/create`, lang)}
                            >
                              {copy.personalize}
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}
