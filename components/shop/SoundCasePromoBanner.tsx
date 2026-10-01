import Image from "next/image";
import Link from "next/link";

import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { SOUND_CASE_PROMO_MEDIA } from "@/lib/shop/soundCasePromoMedia";

export function SoundCasePromoBanner({
  lang,
  mobile = false,
}: {
  lang: Lang;
  mobile?: boolean;
}) {
  const copy = dictionaries[lang].home.soundCasePromo;
  const preorderHref = buildLocalizedPublicPath("/shop/sound-case-001/preorder", lang);

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
          <div className="sound-case-home-promo__prices" aria-label={`${copy.regularPrice}: 49 ₪. ${copy.preorderPrice}: 39 ₪.`}>
            <span>{copy.regularPrice} <s><bdi>49 ₪</bdi></s></span>
            <strong>{copy.preorderPrice} <bdi>39 ₪</bdi></strong>
          </div>
          <div className="sound-case-home-promo__action-row">
            <Link className="sound-case-home-promo__cta" href={preorderHref}>
              {copy.cta}
            </Link>
            <span className="sound-case-home-promo__no-payment">{copy.noPayment}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
