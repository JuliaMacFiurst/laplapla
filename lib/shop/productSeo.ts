/**
 * LapLapLa Shop — Product-specific SEO helpers.
 *
 * Builds structured data (Schema.org), canonical URLs, hreflang,
 * and OG metadata for product pages.
 *
 * Only generates Product schema for products with status "active".
 * Coming-soon and draft products get WebPage schema instead.
 */

import type { Lang } from "@/i18n";
import type { ShopProduct } from "./types";
import { BASE_URL } from "@/lib/config";
import {
  buildCanonicalUrl,
  buildHreflangLinks,
} from "@/lib/i18n/routing";
import { ENTITY_IDS, SITE_NAME } from "@/lib/identity";

/**
 * Build the canonical path for a product page.
 */
export function buildShopProductPath(slug: string): string {
  return `/shop/${slug}`;
}

/**
 * Build the canonical URL for a product page.
 */
export function buildShopProductCanonicalUrl(
  slug: string,
  lang: Lang,
): string {
  return buildCanonicalUrl(BASE_URL, buildShopProductPath(slug), lang);
}

/**
 * Build hreflang links for a product page.
 */
export function buildShopProductHreflangLinks(slug: string) {
  return buildHreflangLinks(BASE_URL, buildShopProductPath(slug));
}

/**
 * Build Schema.org Product structured data for an active product.
 * Returns null for non-active products — do NOT index
 * draft/archived/coming-soon products as purchasable.
 */
export function buildProductJsonLd(
  product: ShopProduct,
  lang: Lang,
): Record<string, unknown> | null {
  if (product.status !== "active") {
    return null;
  }

  const amount = product.price / 100;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title[lang],
    description: product.shortDescription[lang],
    image: product.heroImage,
    sku: product.id,
    brand: {
      "@type": "Organization",
      "@id": ENTITY_IDS.organization,
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      price: amount.toFixed(2),
      priceCurrency: product.currency,
      availability: "https://schema.org/InStock",
      url: buildShopProductCanonicalUrl(product.slug, lang),
      seller: {
        "@type": "Organization",
        "@id": ENTITY_IDS.organization,
        name: SITE_NAME,
      },
    },
  };
}

/**
 * Build breadcrumb structured data for a product page.
 */
export function buildShopBreadcrumbJsonLd(
  product: ShopProduct,
  lang: Lang,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: lang === "ru" ? "Магазин" : lang === "he" ? "חנות" : "Shop",
        item: buildCanonicalUrl(BASE_URL, "/shop", lang),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title[lang],
        item: buildShopProductCanonicalUrl(product.slug, lang),
      },
    ],
  };
}
