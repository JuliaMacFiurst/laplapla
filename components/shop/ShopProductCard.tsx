import Link from "next/link";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getLocalizedShortDescription, getLocalizedTitle } from "@/lib/shop/catalog";
import type { ShopProduct } from "@/lib/shop/types";

export function ShopProductCard({ product, lang }: { product: ShopProduct; lang: Lang }) {
  const shopText = dictionaries[lang].shop;

  return (
    <article className="shop-product-card">
      <div className="shop-product-card__visual" aria-hidden="true">
        <span className="shop-product-card__wave">)))</span>
        <span>001</span>
      </div>
      <div className="shop-product-card__copy">
        <p className="shop-prototype-badge">{shopText.prototypeBadge}</p>
        <h2>{getLocalizedTitle(product, lang)}</h2>
        <p>{getLocalizedShortDescription(product, lang)}</p>
        <Link href={buildLocalizedPublicPath(`/shop/${product.slug}`, lang)}>
          {shopText.soundCase.createCta}
        </Link>
      </div>
    </article>
  );
}
