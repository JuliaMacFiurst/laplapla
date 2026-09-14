import React from "react";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { TopBar } from "@/components/TopBar";
import { ShopComingSoon } from "@/components/shop/ShopComingSoon";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

export default function ShopIndexPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang];
  const { navTitle, hubDescription } = dict.shop;

  return (
    <>
      <Head>
        <title>{`${navTitle} | LapLapLa`}</title>
        <meta name="description" content={hubDescription} />
      </Head>

      <TopBar />

      <main className="ShopPage-main">
        <ShopComingSoon />
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};
