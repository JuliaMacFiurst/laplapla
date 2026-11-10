import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getProductById } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/commerce";
import { getProductPrice, LAUNCH_OFFER_COPY } from "@/lib/shop/launchOffer";
import { SOUND_CASE_PROMO_MEDIA } from "@/lib/shop/soundCasePromoMedia";
import { trackEvent } from "@/lib/analytics/client";

export function SoundCasePromoBanner({
  lang,
  mobile = false,
}: {
  lang: Lang;
  mobile?: boolean;
  checkoutAvailable?: boolean;
}) {
  const copy = dictionaries[lang].home.soundCasePromo;
  const product = getProductById("sound-case-001")!;
  const bannerRef = useRef<HTMLElement>(null);
  const offer = getProductPrice(product);
  const offerCopy = LAUNCH_OFFER_COPY[lang];
  const detailHref = buildLocalizedPublicPath(`/shop/${product.slug}`, lang);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      trackEvent("shop_promo_impression", {
        section: "shop", content_type: "shop_product", content_id: product.id,
        content_slug: product.slug, language: lang, entry_point: "home_promo",
      });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(banner);
    return () => observer.disconnect();
  }, [lang, product.id, product.slug]);

  return (
    <section
      ref={bannerRef}
      className={`sound-case-home-promo${mobile ? " sound-case-home-promo--mobile home-mobile-screen" : ""}`}
      aria-labelledby={mobile ? "sound-case-promo-title-mobile" : "sound-case-promo-title"}
    >
      <div className="sound-case-home-promo__scene">
        <Image
          className="sound-case-home-promo__hero"
          src={mobile ? SOUND_CASE_PROMO_MEDIA.banners.square : SOUND_CASE_PROMO_MEDIA.banners.horizontal}
          alt={copy.imageAlt}
          fill
          sizes={mobile ? "100vw" : "(max-width: 1199px) calc(100vw - 40px), 1024px"}
          priority
          unoptimized
        />
        <span className="sound-case-home-promo__scene-glow" aria-hidden="true" />
      </div>

      <div className="sound-case-home-promo__paper">
        <Image
          className="sound-case-home-promo__sticker sound-case-home-promo__sticker--parrot"
          src={SOUND_CASE_PROMO_MEDIA.stickers.parrotWithSandBag}
          alt=""
          width={358}
          height={352}
          aria-hidden="true"
          unoptimized
        />
        <Image
          className="sound-case-home-promo__sticker sound-case-home-promo__sticker--dune"
          src={SOUND_CASE_PROMO_MEDIA.stickers.singingDune}
          alt=""
          width={371}
          height={279}
          aria-hidden="true"
          unoptimized
        />

        <div className="sound-case-home-promo__copy">
          <p className="sound-case-home-promo__eyebrow">{copy.eyebrow}</p>
          <h2 id={mobile ? "sound-case-promo-title-mobile" : "sound-case-promo-title"}>
            {copy.title}
          </h2>
          <p className="sound-case-home-promo__hook">{copy.hook}</p>
        </div>

        <div className="sound-case-home-promo__offer">
          <div className="sound-case-home-promo__prices">
            {offer.promotional ? <span>{offerCopy.badge} · {offerCopy.savings} <s><bdi>{formatPrice(offer.regularMinor, product.currency, lang)}</bdi></s></span> : null}
            <strong><bdi>{formatPrice(offer.currentMinor, product.currency, lang)}</bdi></strong>
          </div>
          <div className="sound-case-home-promo__action-row">
            <Link
              className="sound-case-home-promo__cta"
              href={detailHref}
              onClick={() => trackEvent("shop_promo_click", {
                section: "shop", content_type: "shop_product", content_id: product.id,
                content_slug: product.slug, language: lang, entry_point: "home_promo",
                destination: "product_detail",
              })}
            >
              {copy.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
