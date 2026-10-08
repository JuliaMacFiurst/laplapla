import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getLocalizedShortDescription, getLocalizedTitle } from "@/lib/shop/catalog";
import { formatPrice } from "@/lib/shop/commerce";
import { SHOP_STOREFRONT_COPY } from "@/lib/shop/shopStorefront";
import type { ShopProduct } from "@/lib/shop/types";

export function ShopProductCard({ product, lang }: { product: ShopProduct; lang: Lang }) {
  const copy = SHOP_STOREFRONT_COPY[lang];

  return (
    <article className="shop-product-card" data-product-status={product.status}>
      <div className="shop-product-card__visual">
        <Image
          src={product.heroImage}
          alt={getLocalizedTitle(product, lang)}
          fill
          sizes="(max-width: 760px) calc(100vw - 32px), 52vw"
          priority
          unoptimized
        />
        <span className="shop-product-card__number" aria-hidden="true">Sound Case #001</span>
      </div>
      <div className="shop-product-card__copy">
        <p className="shop-product-card__kicker">{copy.featuredLabel}</p>
        <h2>{getLocalizedTitle(product, lang)}</h2>
        <p className="shop-product-card__subtitle">{product.subtitle[lang]}</p>
        <p className="shop-product-card__value">{copy.productValue || getLocalizedShortDescription(product, lang)}</p>
        <dl className="shop-product-card__facts">
          {product.recommendedAge ? <div><dt>{copy.ageLabel}</dt><dd>{product.recommendedAge[lang]}</dd></div> : null}
          {product.duration ? <div><dt>{copy.durationLabel}</dt><dd>{product.duration[lang]}</dd></div> : null}
          <div><dt>{copy.languagesLabel}</dt><dd><bdi>RU · EN · HE</bdi></dd></div>
          <div><dt>{copy.formatLabel}</dt><dd>{copy.formatValue}</dd></div>
        </dl>
        <div className="shop-product-card__purchase">
          <div><span>{copy.priceLabel}</span><strong><bdi>{formatPrice(product.price, product.currency, lang)}</bdi></strong></div>
          <Link href={buildLocalizedPublicPath(`/shop/${product.slug}`, lang)}>{copy.detailsAction}</Link>
        </div>
        <p className="shop-product-card__availability">{copy.availability}</p>
      </div>
    </article>
  );
}
