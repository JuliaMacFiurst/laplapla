import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import TopBar from "@/components/TopBar";
import { ShopComingSoon } from "@/components/shop/ShopComingSoon";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export default function ShopIndexPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang];
  const { navTitle, hubDescription } = dict.shop;

  useEffect(() => {
    trackEvent("shop_view", {
      section: "shop",
      language: lang,
    });
  }, [lang]);

  return (
    <>
      <Head>
        <title>{`${navTitle} | LapLapLa`}</title>
        <meta name="description" content={hubDescription} />
      </Head>

      <TopBar lang={lang} />

      <main className="ShopPage-main">
        <ShopComingSoon />
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
