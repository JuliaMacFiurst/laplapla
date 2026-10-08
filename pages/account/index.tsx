import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { customerCopy } from "@/lib/customer/copy";
import type { CustomerProfile, ProductEntitlement } from "@/lib/customer/types";
import type { CustomerAccessGrant, CustomerAccountResponse, CustomerPurchase } from "@/lib/customer/purchases";
import { getLocalizedShortDescription, getLocalizedTitle, getProductById } from "@/lib/shop/catalog";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import type { CustomerBillingIdentityResponse } from "@/lib/customer/billingIdentity";

type AccountResponse = CustomerAccountResponse & { profile: CustomerProfile | null; entitlements: ProductEntitlement[] };

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
  const [receiptDownload, setReceiptDownload] = useState<{ orderId: string | null; error: boolean }>({ orderId: null, error: false });
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
  const downloadReceipt = async (purchase: CustomerPurchase) => {
    if (auth.status !== "authenticated") return;
    setReceiptDownload({ orderId: purchase.orderId, error: false });
    try {
      const response = await fetch(`/api/customer/purchases/${encodeURIComponent(purchase.orderId)}/receipt`, { headers: { Authorization: `Bearer ${auth.session.access_token}` } });
      if (!response.ok) throw new Error("receipt_download_failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${purchase.receipt.displayNumber ?? "purchase"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setReceiptDownload({ orderId: null, error: false });
    } catch {
      setReceiptDownload({ orderId: null, error: true });
    }
  };
  const paymentText = (status: CustomerPurchase["paymentStatus"]) => status === "paid" ? copy.paymentPaid : status === "processing" ? copy.paymentProcessing : status === "cancelled" ? copy.paymentCancelled : copy.paymentFailed;
  const accessText = (status: CustomerPurchase["accessStatus"]) => status === "active" ? copy.accessActive : copy.accessUnavailable;
  const receiptText = (status: CustomerPurchase["receipt"]["status"]) => status === "available" ? copy.receiptAvailable : status === "preparing" ? copy.receiptPreparing : copy.receiptUnavailable;

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
              {account && account.purchases.length === 0 && account.accessGrants.length === 0 ? (
                <p className="customer-account__empty">{copy.emptyPurchases}</p>
              ) : null}
              {account?.purchases.length ? (
                <ul className="customer-account__products customer-account__purchases">
                  {account.purchases.map((purchase) => {
                    const product = getProductById(purchase.productId);
                    const title = product ? getLocalizedTitle(product, lang) : purchase.productTitle;
                    const description = product ? getLocalizedShortDescription(product, lang) : "";
                    const active = purchase.accessStatus === "active";
                    const createPath = product ? buildLocalizedPublicPath(`/shop/${product.slug}/create`, lang) : null;
                    const editPath = createPath ? `${createPath}?mode=edit` : null;
                    const printPath = createPath ? `${createPath}?mode=ready` : null;
                    return (
                      <li key={purchase.orderId}>
                        <div className="customer-account__purchase-main">
                          <h3>{title}</h3>
                          {description ? <p>{description}</p> : null}
                          <dl className="customer-account__purchase-meta">
                            <div><dt>{copy.purchaseDate}</dt><dd>{new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(purchase.purchasedAt))}</dd></div>
                            <div><dt>{copy.purchaseAmount}</dt><dd>{new Intl.NumberFormat(lang, { style: "currency", currency: purchase.currency }).format(purchase.amountMinor / 100)}</dd></div>
                          </dl>
                          <div className="customer-account__purchase-statuses">
                            <span className={purchase.paymentStatus === "paid" ? "is-active" : "is-inactive"}>{copy.paymentLabel}: {paymentText(purchase.paymentStatus)}</span>
                            <span className={active ? "is-active" : "is-inactive"}>{copy.accessLabel}: {accessText(purchase.accessStatus)}</span>
                            {purchase.receipt.status !== "not_available" ? <span className={purchase.receipt.status === "available" ? "is-active" : "is-pending"}>{copy.receiptLabel}: {receiptText(purchase.receipt.status)}</span> : null}
                          </div>
                          {active ? <p className="customer-account__reprint-help">{copy.reprintHelp}</p> : null}
                        </div>
                        <div className="customer-account__actions">
                          {active && editPath ? <Link className="customer-account__secondary" href={editPath}>{copy.editPersonalization}</Link> : null}
                          {active && printPath ? <Link className="customer-account__primary" href={printPath}>{copy.openAndPrint}</Link> : null}
                          {purchase.receipt.status === "available" ? <button className="customer-account__secondary" type="button" disabled={receiptDownload.orderId === purchase.orderId} onClick={() => void downloadReceipt(purchase)}>{receiptDownload.orderId === purchase.orderId ? copy.downloadingReceipt : copy.downloadReceipt}</button> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {receiptDownload.error ? <p className="customer-account__download-error" role="alert">{copy.receiptDownloadError}</p> : null}
              {account?.accessGrants.length ? <section className="customer-account__grants"><h2>{copy.accessProductsTitle}</h2><ul className="customer-account__products">{account.accessGrants.map((grant: CustomerAccessGrant) => { const product = getProductById(grant.productId); const active = grant.status === "active"; return <li key={grant.entitlementId}><div><span className={active ? "is-active" : "is-inactive"}>{active ? copy.active : copy.unavailable}</span><h3>{product ? getLocalizedTitle(product, lang) : grant.productId}</h3><p>{copy.accessWithoutPurchase}</p><small>{copy.accessSource}: {grant.source}</small></div>{active && product ? <div className="customer-account__actions"><Link className="customer-account__primary" href={buildLocalizedPublicPath(`/shop/${product.slug}/create`, lang)}>{copy.openEditPrint}</Link></div> : null}</li>; })}</ul></section> : null}
            </>
          ) : null}
        </section>
      </main>
    </>
  );
}
