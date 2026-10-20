import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { PayPalCheckout } from "@/components/shop/PayPalCheckout";
import { buildLocalizedPublicPath, getCurrentLang } from "@/lib/i18n/routing";
import { supportCopy } from "@/lib/support/copy";
import { getProductBySlug } from "@/lib/shop/catalog";
import { paypalCheckoutCopy } from "@/lib/shop/paypalCheckoutCopy";

type PayPalCheckoutPageProps = { slug: string; environment: "sandbox" | "live" };

export default function PayPalCheckoutPage({ slug, environment }: PayPalCheckoutPageProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = paypalCheckoutCopy[lang];
  const product = getProductBySlug(slug);
  if (!product) return null;

  return (
    <>
      <Head>
        <title>{`${copy.title} | LapLapLa`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="paypal-checkout" dir={lang === "he" ? "rtl" : "ltr"}>
        <header className="paypal-checkout__header">
          <p className="paypal-checkout__badge">{environment === "sandbox" ? copy.sandboxBadge : copy.liveBadge}</p>
          <h1>{copy.title}</h1>
          <p>{environment === "sandbox" ? copy.intro : copy.liveIntro}</p>
          <Link href={buildLocalizedPublicPath("/support", lang)}>{supportCopy[lang].checkoutLink}</Link>
        </header>
        <PayPalCheckout lang={lang} />
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PayPalCheckoutPageProps> = async ({ params, req }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = getProductBySlug(slug);
  if (slug !== "sound-case-001" || !product) {
    return { notFound: true };
  }
  const [{ getPayPalServerConfig }, { isPayPalCheckoutAvailable }, { hasValidPrivateLiveCheckoutCookie, PRIVATE_LIVE_TEST_COOKIE }] = await Promise.all([
    import("@/lib/server/commerce/paypal/config"),
    import("@/lib/server/commerce/paypal/checkoutAvailability"),
    import("@/lib/server/commerce/paypal/privateLiveTest"),
  ]);
  try {
    const config = getPayPalServerConfig();
    if (!isPayPalCheckoutAvailable(config) && !hasValidPrivateLiveCheckoutCookie(config, req?.cookies?.[PRIVATE_LIVE_TEST_COOKIE])) return { notFound: true };
    return { props: { slug, environment: config.environment } };
  } catch {
    return { notFound: true };
  }
};
