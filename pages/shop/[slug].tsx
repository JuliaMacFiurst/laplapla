import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ShopProductDetail } from "@/components/shop/ShopProductDetail";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/shop/catalog";
import { isPublicProduct } from "@/lib/shop/types";
import {
  buildShopProductCanonicalUrl,
  buildShopProductHreflangLinks,
} from "@/lib/shop/productSeo";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

type ShopProductPageProps = {
  slug: string;
};

export default function ShopProductPage({ slug }: ShopProductPageProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const product = getProductBySlug(slug);
  const productText = dictionaries[lang].shop.soundCase;

  useEffect(() => {
    trackEvent("product_view", {
      section: "shop",
      content_type: "shop_product",
      content_slug: slug,
      language: lang,
    });
  }, [lang, slug]);

  if (!product) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{`${productText.title} | LapLapLa`}</title>
        <meta name="description" content={productText.description} />
        <link rel="canonical" href={buildShopProductCanonicalUrl(slug, lang)} />
        {buildShopProductHreflangLinks(slug).map((link) => (
          <link key={link.hrefLang} rel="alternate" hrefLang={link.hrefLang} href={link.href} />
        ))}
      </Head>
      <ShopProductDetail product={product} lang={lang} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ShopProductPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = getProductBySlug(slug);
  if (!product || !isPublicProduct(product)) {
    return { notFound: true };
  }

  return {
    props: { slug },
  };
};
