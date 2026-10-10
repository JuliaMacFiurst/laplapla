import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { SHOP_STOREFRONT_COPY } from "@/lib/shop/shopStorefront";
import {
  getLocalizedFreeExperience,
  type ShopFreeExperience,
} from "@/lib/shop/freeExperiences";

export function ShopFreeExperienceCard({
  experience,
  lang,
}: {
  experience: ShopFreeExperience;
  lang: Lang;
}) {
  const copy = getLocalizedFreeExperience(experience, lang);
  const storefront = SHOP_STOREFRONT_COPY[lang];

  return (
    <article
      className="shop-product-card shop-product-card--free"
      data-experience-id={experience.id}
      data-category={experience.category}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div className="shop-product-card__visual">
        <Image
          src={experience.image}
          alt={copy.title}
          fill
          sizes="(max-width: 760px) calc(100vw - 32px), 52vw"
          unoptimized
        />
        <span className="shop-product-card__number">{copy.label}</span>
      </div>
      <div className="shop-product-card__copy">
        <p className="shop-product-card__kicker">{copy.label}</p>
        <h2>{copy.title}</h2>
        <p className="shop-product-card__value">{copy.description}</p>
        <dl className="shop-product-card__facts">
          <div><dt>{storefront.ageLabel}</dt><dd>{copy.age}</dd></div>
          <div><dt>{copy.durationLabel}</dt><dd>{copy.duration}</dd></div>
          <div><dt>{storefront.languagesLabel}</dt><dd><bdi>RU · EN · HE</bdi></dd></div>
          <div><dt>{storefront.formatLabel}</dt><dd>{copy.format}</dd></div>
        </dl>
        <div className="shop-product-card__purchase">
          <div><span>{copy.priceLabel}</span><strong>{copy.priceValue}</strong></div>
          <Link href={buildLocalizedPublicPath(experience.href, lang)}>
            {copy.cta}
          </Link>
        </div>
      </div>
    </article>
  );
}
