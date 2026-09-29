import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { customerCopy } from "@/lib/customer/copy";
import { resolveEntitledCatalogProducts } from "@/lib/customer/catalog";
import type { CustomerProfile, ProductEntitlement } from "@/lib/customer/types";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";

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

    void fetch("/api/customer/account", {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Account request failed (${response.status})`);
        return response.json() as Promise<AccountResponse>;
      })
      .then(setAccount)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setAccountError(error instanceof Error ? error.message : "Unable to load account");
        }
      });

    return () => controller.abort();
  }, [auth]);

  const accountPath = buildLocalizedPublicPath("/account", lang);
  const signInPath = `${buildLocalizedPublicPath("/account/sign-in", lang)}?next=${encodeURIComponent(accountPath)}`;

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
