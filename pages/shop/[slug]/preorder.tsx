import { useEffect } from "react";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { PreorderSignupForm } from "@/components/shop/PreorderSignupForm";
import { dictionaries } from "@/i18n";
import { trackEvent } from "@/lib/analytics/client";
import { getCurrentLang } from "@/lib/i18n/routing";
import { getProductBySlug } from "@/lib/shop/catalog";
import type { PreorderOfferStatus } from "@/lib/shop/preorders";
import { SOUND_CASE_PROMO_MEDIA } from "@/lib/shop/soundCasePromoMedia";
import { isPublicProduct } from "@/lib/shop/types";
import {
  getSoundCasePreorderOfferStatus,
  SOUND_CASE_PREORDER_OFFER,
} from "@/lib/server/commerce/preorderOffers";

type PreorderPageProps = {
  slug: string;
  initialOfferStatus: PreorderOfferStatus;
  canonicalPriceMinor: number;
  preorderPriceMinor: number;
  currency: string;
};

export default function PreorderPage({
  slug,
  initialOfferStatus,
  canonicalPriceMinor,
  preorderPriceMinor,
  currency,
}: PreorderPageProps) {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const copy = dictionaries[lang].shop.soundCase.preorder;

  useEffect(() => {
    trackEvent("preorder_page_view", {
      section: "shop",
      content_type: "shop_product",
      content_id: "sound-case-001",
      content_slug: slug,
      offer_code: "sound-case-001-preorder",
      language: lang,
    });
  }, [lang, slug]);

  return (
    <>
      <SEO
        title={`${copy.seoTitle} | LapLapLa`}
        description={copy.seoDescription}
        path={`/shop/${slug}/preorder`}
        lang={lang}
      />
      <main className="preorder-page" dir={lang === "he" ? "rtl" : "ltr"}>
        <div className="preorder-page__visual">
          <Image
            className="preorder-page__poster"
            src={SOUND_CASE_PROMO_MEDIA.banners.vertical}
            alt={copy.posterAlt}
            fill
            sizes="(max-width: 760px) calc(100vw - 1rem), (max-width: 1200px) 44vw, 500px"
            priority
            unoptimized
          />
          <span className="preorder-page__poster-shade" aria-hidden="true" />
          <span className="preorder-page__poster-label" aria-hidden="true">{copy.adventureTitle}</span>
        </div>
        <div className="preorder-page__content">
          <Image
            className="preorder-page__sticker"
            src={SOUND_CASE_PROMO_MEDIA.stickers.singingGrains}
            alt=""
            width={376}
            height={319}
            aria-hidden="true"
            unoptimized
          />
          <p className="shop-prototype-badge">{copy.eyebrow}</p>
          <h1>{copy.adventureTitle}</h1>
          <p className="preorder-page__hook">{copy.hook}</p>
          <p className="preorder-page__intro">{copy.intro}</p>
          <PreorderSignupForm
            lang={lang}
            initialOfferStatus={initialOfferStatus}
            canonicalPriceMinor={canonicalPriceMinor}
            preorderPriceMinor={preorderPriceMinor}
            currency={currency}
          />
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PreorderPageProps> = async ({ params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const product = getProductBySlug(slug);
  if (
    slug !== SOUND_CASE_PREORDER_OFFER.productId ||
    !product ||
    !isPublicProduct(product)
  ) {
    return { notFound: true };
  }

  let initialOfferStatus: PreorderOfferStatus = "closed";
  try {
    initialOfferStatus = await getSoundCasePreorderOfferStatus();
  } catch {
    // Fail closed if the offer state cannot be verified server-side.
  }

  return {
    props: {
      slug,
      initialOfferStatus,
      canonicalPriceMinor: product.price,
      preorderPriceMinor: SOUND_CASE_PREORDER_OFFER.priceMinor,
      currency: product.currency,
    },
  };
};
