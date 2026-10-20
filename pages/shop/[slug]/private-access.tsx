import { useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/shop/catalog";

const copy = {
  ru: { title: "Контрольная покупка", intro: "Войдите в назначенный аккаунт, чтобы продолжить.", button: "Продолжить к оплате", signIn: "Войти", unavailable: "Приватная покупка сейчас недоступна." },
  en: { title: "Controlled purchase", intro: "Sign in with the designated account to continue.", button: "Continue to checkout", signIn: "Sign in", unavailable: "Private checkout is currently unavailable." },
  he: { title: "רכישה מבוקרת", intro: "יש להתחבר לחשבון המורשה כדי להמשיך.", button: "המשך לתשלום", signIn: "התחברות", unavailable: "הרכישה הפרטית אינה זמינה כעת." },
};

export default function PrivateLiveAccessPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const auth = useCustomerSession();
  const [state, setState] = useState<"idle" | "working" | "unavailable">("idle");
  const path = buildLocalizedPublicPath("/shop/sound-case-001/private-access", lang);
  const signIn = `${buildLocalizedPublicPath("/account/sign-in", lang)}?next=${encodeURIComponent(path)}`;

  async function continueToCheckout() {
    if (auth.status !== "authenticated" || state === "working") return;
    setState("working");
    try {
      const response = await fetch("/api/customer/checkout/paypal/private-access", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("unavailable");
      await router.replace(buildLocalizedPublicPath("/shop/sound-case-001/checkout", lang));
    } catch {
      setState("unavailable");
    }
  }

  return <>
    <Head><title>{copy[lang].title} | LapLapLa</title><meta name="robots" content="noindex, nofollow" /></Head>
    <main className="paypal-checkout" dir={lang === "he" ? "rtl" : "ltr"}>
      <header className="paypal-checkout__header">
        <h1>{copy[lang].title}</h1>
        <p>{copy[lang].intro}</p>
        {auth.status === "anonymous" ? <Link href={signIn}>{copy[lang].signIn}</Link> : null}
        {auth.status === "authenticated" ? <button type="button" disabled={state === "working"} onClick={() => void continueToCheckout()}>{copy[lang].button}</button> : null}
        {state === "unavailable" ? <p role="alert">{copy[lang].unavailable}</p> : null}
      </header>
    </main>
  </>;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  return slug === "sound-case-001" && getProductBySlug(slug) ? { props: {} } : { notFound: true };
};
