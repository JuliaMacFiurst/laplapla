import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ShopComingSoon } from "@/components/shop/ShopComingSoon";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { ShopFreeExperienceCard } from "@/components/shop/ShopFreeExperienceCard";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { getPublicProducts } from "@/lib/shop/catalog";
import { SHOP_STOREFRONT_COPY } from "@/lib/shop/shopStorefront";
import { SHOP_FREE_EXPERIENCES } from "@/lib/shop/freeExperiences";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export default function ShopIndexPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang];
  const { navTitle, hubDescription, conceptCards } = dict.shop;
  const products = getPublicProducts();
  const storefront = SHOP_STOREFRONT_COPY[lang];

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
            <header className="shop-catalog__hero">
              <p>{storefront.eyebrow}</p>
              <h1>{storefront.title}</h1>
              <p>{storefront.intro}</p>
            </header>
            <section className="shop-catalog__featured" aria-label={storefront.featuredLabel}>
              {products.map((product) => (
                <ShopProductCard key={product.id} product={product} lang={lang} />
              ))}
              {SHOP_FREE_EXPERIENCES.map((experience) => (
                <ShopFreeExperienceCard key={experience.id} experience={experience} lang={lang} />
              ))}
            </section>
            <section className="shop-catalog__directions" aria-labelledby="shop-directions-title">
              <h2 id="shop-directions-title">{storefront.directionsTitle}</h2>
              <div className="shop-catalog__direction-grid">
                {(["solve", "create", "explore", "together"] as const).map((key) => (
                  <div key={key} className={`shop-catalog__direction shop-catalog__direction--${key}`}>
                    <h3>{conceptCards[key].title}</h3>
                    <p>{conceptCards[key].desc}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="shop-catalog__how" aria-labelledby="shop-how-title">
              <h2 id="shop-how-title">{storefront.howTitle}</h2>
              <ol>{storefront.howSteps.map((step) => <li key={step}>{step}</li>)}</ol>
            </section>
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
