/**
 * LapLapLa Shop — Static product catalog.
 *
 * Products are defined here as plain TypeScript data.
 * When the catalog grows beyond ~20 items, consider migrating
 * to a Supabase table with the same ShopProduct shape.
 *
 * All queries filter by status — draft/archived products never
 * reach the visitor.
 */

import type { Lang } from "@/i18n";
import type { ShopProduct, ProductCategory } from "./types";
import { isPublicProduct, isPurchasableProduct } from "./types";

// ---------------------------------------------------------------------------
// Catalog — currently empty; first real products will be added here.
// ---------------------------------------------------------------------------

const PRODUCTS: ShopProduct[] = [];

// ---------------------------------------------------------------------------
// Catalog queries
// ---------------------------------------------------------------------------

/** All products visible to visitors (active + coming-soon). */
export function getPublicProducts(): ShopProduct[] {
  return PRODUCTS.filter(isPublicProduct).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Products available for actual purchase. */
export function getPurchasableProducts(): ShopProduct[] {
  return PRODUCTS.filter(isPurchasableProduct).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Featured products for homepage spotlight. */
export function getFeaturedProducts(): ShopProduct[] {
  return getPublicProducts().filter((p) => p.featured);
}

/** Products in a given category. */
export function getProductsByCategory(
  category: ProductCategory,
): ShopProduct[] {
  return getPublicProducts().filter((p) => p.category === category);
}

/** Find a single product by slug (any status — page decides what to show). */
export function getProductBySlug(slug: string): ShopProduct | null {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

/** Whether the shop has any public products to display. */
export function hasPublicProducts(): boolean {
  return PRODUCTS.some(isPublicProduct);
}

/** Localized title for a product. */
export function getLocalizedTitle(
  product: ShopProduct,
  lang: Lang,
): string {
  return product.title[lang] || product.title.en || product.title.ru;
}

/** Localized short description. */
export function getLocalizedShortDescription(
  product: ShopProduct,
  lang: Lang,
): string {
  return (
    product.shortDescription[lang] ||
    product.shortDescription.en ||
    product.shortDescription.ru
  );
}

/**
 * All public product slugs — used for sitemap generation
 * and static path enumeration.
 */
export function getPublicProductSlugs(): string[] {
  return getPublicProducts().map((p) => p.slug);
}
