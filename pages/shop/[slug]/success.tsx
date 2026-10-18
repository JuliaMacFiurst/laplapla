import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/shop/catalog";
import { purchaseSuccessCopy } from "@/lib/shop/purchaseSuccessCopy";
import { isPublicProduct } from "@/lib/shop/types";
import type { PurchaseStatusResponse } from "@/pages/api/customer/checkout/paypal/status";

type ViewState = "loading" | "ready" | "processing" | "unconfirmed" | "error";

export function PurchaseSuccessView({ lang, state, authStatus, onCheckAgain }: {
  lang: Lang;
  state: ViewState;
  authStatus: "loading" | "anonymous" | "authenticated" | "error";
  onCheckAgain: () => void;
}) {
  const copy = purchaseSuccessCopy[lang];
  const successPath = buildLocalizedPublicPath("/shop/sound-case-001/success", lang);
  const checkoutPath = buildLocalizedPublicPath("/shop/sound-case-001/checkout", lang);
  const accountPath = buildLocalizedPublicPath("/account", lang);
  const createPath = buildLocalizedPublicPath("/shop/sound-case-001/create", lang);
  const signInPath = `${buildLocalizedPublicPath("/account/sign-in", lang)}?next=${encodeURIComponent(typeof window === "undefined" ? successPath : `${window.location.pathname}${window.location.search}`)}`;

  const signedOut = authStatus === "anonymous";
  const heading = signedOut ? copy.signInTitle
    : authStatus === "error" || state === "error" ? copy.errorTitle
      : state === "ready" && authStatus === "authenticated" ? copy.title
        : state === "processing" ? copy.processingTitle
          : state === "unconfirmed" ? copy.unconfirmedTitle : copy.loading;
  const body = signedOut ? copy.signInBody
    : authStatus === "error" || state === "error" ? copy.errorBody
      : state === "ready" && authStatus === "authenticated" ? copy.body
        : state === "processing" ? copy.processingBody
          : state === "unconfirmed" ? copy.unconfirmedBody : null;

  return (
    <main className={`purchase-success purchase-success--${state}`} dir={lang === "he" ? "rtl" : "ltr"}>
      <section className="purchase-success__card" aria-live="polite">
        <span className="purchase-success__mark" aria-hidden="true">✦</span>
        <h1>{heading}</h1>
        {body ? <p>{body}</p> : null}
        <div className="purchase-success__actions">
          {signedOut ? <Link className="purchase-success__primary" href={signInPath}>{copy.signIn}</Link> : null}
          {state === "ready" && authStatus === "authenticated" ? <Link className="purchase-success__primary" href={createPath}>{copy.personalize}</Link> : null}
          {state === "processing" || state === "error" ? <button className="purchase-success__primary" type="button" onClick={onCheckAgain}>{copy.checkAgain}</button> : null}
          {state === "unconfirmed" && authStatus === "authenticated" ? <Link className="purchase-success__primary" href={checkoutPath}>{copy.checkout}</Link> : null}
          {authStatus === "authenticated" ? <Link className="purchase-success__secondary" href={accountPath}>{copy.purchases}</Link> : null}
        </div>
      </section>
    </main>
  );
}

export default function PurchaseSuccessPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const auth = useCustomerSession();
  const [verification, setVerification] = useState<{ orderId: string | null; userId: string; state: ViewState } | null>(null);
  const [revision, setRevision] = useState(0);
  const orderId = typeof router.query.orderId === "string" ? router.query.orderId : null;
  const userId = auth.status === "authenticated" ? auth.session.user.id : null;
  const state = verification?.orderId === orderId && verification.userId === userId ? verification.state : "loading";

  useEffect(() => {
    if (!router.isReady || auth.status !== "authenticated") return;
    if (!orderId) {
      setVerification({ orderId: null, userId: auth.session.user.id, state: "unconfirmed" });
      return;
    }
    const controller = new AbortController();
    setVerification({ orderId, userId: auth.session.user.id, state: "loading" });
    void fetch(`/api/customer/checkout/paypal/status?orderId=${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      const result = await response.json() as PurchaseStatusResponse;
      if (!response.ok || !result.ok) {
        if (response.status === 404 || response.status === 400) return "unconfirmed" as const;
        throw new Error("Purchase verification unavailable");
      }
      return result.status;
    }).then((status) => {
      if (!controller.signal.aborted) setVerification({ orderId, userId: auth.session.user.id, state: status });
    }).catch(() => {
      if (!controller.signal.aborted) setVerification({ orderId, userId: auth.session.user.id, state: "error" });
    });
    return () => controller.abort();
  }, [auth, orderId, revision, router.isReady]);

  return (
    <>
      <Head>
        <title>{purchaseSuccessCopy[lang].pageTitle} | LapLapLa</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PurchaseSuccessView lang={lang} state={state} authStatus={auth.status} onCheckAgain={() => setRevision((value) => value + 1)} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = getProductBySlug(slug);
  if (slug !== "sound-case-001" || !product || !isPublicProduct(product)) return { notFound: true };
  return { props: {} };
};
