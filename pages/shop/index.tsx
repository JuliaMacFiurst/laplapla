import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ShopComingSoon } from "@/components/shop/ShopComingSoon";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { getPublicProducts } from "@/lib/shop/catalog";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export default function ShopIndexPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang];
  const { navTitle, hubDescription } = dict.shop;
  const products = getPublicProducts();

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

      <main className="ShopPage-main">
        {products.length ? (
          <div className="shop-catalog" dir={lang === "he" ? "rtl" : "ltr"}>
            <header className="shop-catalog__header">
              <h1>{dict.shop.catalogTitle}</h1>
              <p>{dict.shop.catalogIntro}</p>
            </header>
            <div className="shop-catalog__grid">
              {products.map((product) => (
                <ShopProductCard key={product.id} product={product} lang={lang} />
              ))}
            </div>
          </div>
        ) : (
          <ShopComingSoon />
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
