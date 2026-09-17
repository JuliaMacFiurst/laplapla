import Link from "next/link";
import { dictionaries, type Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import type { ShopProduct } from "@/lib/shop/types";

export function ShopProductDetail({ product, lang }: { product: ShopProduct; lang: Lang }) {
  const text = dictionaries[lang].shop;
  const productText = text.soundCase;

  return (
    <main className="shop-product-page" dir={lang === "he" ? "rtl" : "ltr"}>
      <div className="shop-product-page__visual" aria-hidden="true">
        <div className="shop-product-page__rings" />
        <strong>001</strong>
      </div>
      <div className="shop-product-page__content">
        <p className="shop-prototype-badge">{text.prototypeBadge}</p>
        <p className="shop-product-page__eyebrow">{productText.eyebrow}</p>
        <h1>{product.title[lang]}</h1>
        <h2>{productText.subtitle}</h2>
        <p>{productText.description}</p>
        <ul>
          {productText.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
        </ul>
        <Link
          className="shop-product-page__cta"
          href={buildLocalizedPublicPath(`/shop/${product.slug}/create`, lang)}
        >
          {productText.createCta}
        </Link>
        <p className="shop-product-page__note">{productText.preparationNote}</p>
      </div>
    </main>
  );
}
