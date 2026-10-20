import Image from "next/image";
import Link from "next/link";

import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getProductById } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/commerce";
import { getProductPrice, LAUNCH_OFFER_COPY } from "@/lib/shop/launchOffer";
import { SOUND_CASE_PROMO_MEDIA } from "@/lib/shop/soundCasePromoMedia";
import { trackProductInterest } from "@/lib/analytics/commerce";

export function SoundCasePromoBanner({
  lang,
  mobile = false,
  checkoutAvailable = false,
}: {
  lang: Lang;
  mobile?: boolean;
  checkoutAvailable?: boolean;
}) {
  const copy = dictionaries[lang].home.soundCasePromo;
  const product = getProductById("sound-case-001");
  if (!product) return null;
  const offer = getProductPrice(product);
  const offerCopy = LAUNCH_OFFER_COPY[lang];
  const checkoutHref = buildLocalizedPublicPath("/shop/sound-case-001/checkout", lang);

  return (
    <section
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
            {checkoutAvailable ? <Link
              className="sound-case-home-promo__cta"
              href={checkoutHref}
              onClick={() => trackProductInterest({
                productId: product.id,
                contentSlug: product.slug,
                language: lang,
                entryPoint: "home_promo",
              })}
            >
              {offerCopy.buy}
            </Link> : <span className="sound-case-home-promo__cta sound-case-home-promo__cta--unavailable" role="status">{offerCopy.comingSoon}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
