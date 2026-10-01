import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { PayPalCheckout } from "@/components/shop/PayPalCheckout";
import { getCurrentLang } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/shop/catalog";
import { paypalCheckoutCopy } from "@/lib/shop/paypalCheckoutCopy";

type PayPalCheckoutPageProps = { slug: string };

export default function PayPalCheckoutPage({ slug }: PayPalCheckoutPageProps) {
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
          <p className="paypal-checkout__badge">{copy.sandboxBadge}</p>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </header>
        <PayPalCheckout lang={lang} />
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PayPalCheckoutPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = getProductBySlug(slug);
  if (slug !== "sound-case-001" || !product || process.env.PAYPAL_ENVIRONMENT !== "sandbox") {
    return { notFound: true };
  }
  return { props: { slug } };
};
