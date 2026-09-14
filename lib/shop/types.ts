/**
 * LapLapLa Shop — Product domain types.
 *
 * These types describe WHAT is being sold, not HOW it is purchased.
 * Payment-specific identifiers live in `commerce` sub-object to keep
 * the product domain clean and provider-agnostic.
 */

import type { Lang } from "@/i18n";

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export const PRODUCT_STATUSES = [
  "draft",
  "coming-soon",
  "active",
  "archived",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_FORMATS = [
  "pdf",
  "printable",
  "digital-bundle",
  "interactive",
] as const;

export type ProductFormat = (typeof PRODUCT_FORMATS)[number];

export const PRODUCT_CATEGORIES = [
  "adventures",
  "science",
  "art",
  "family",
  "books",
  "games",
  "adults",
  "kids",
  "seasonal",
  "bundles",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Localized helpers
// ---------------------------------------------------------------------------

export type LocalizedString = Record<Lang, string>;

/**
 * Helper to create a LocalizedString with the same value for all languages.
 * Useful as a placeholder during early catalog authoring.
 */
export function localizedString(
  ru: string,
  en: string,
  he: string,
): LocalizedString {
  return { ru, en, he };
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface ShopProduct {
  /** Stable internal identifier. */
  id: string;

  /** URL-safe slug used for `/shop/[slug]`. */
  slug: string;

  title: LocalizedString;
  subtitle: LocalizedString;
  shortDescription: LocalizedString;
  longDescription: LocalizedString;

  /** Price in the smallest currency unit (e.g. cents/agorot). 0 = free. */
  price: number;

  /** ISO 4217 currency code. */
  currency: "ILS" | "USD" | "EUR";

  /** CDN URL for the main hero image. */
  heroImage: string;

  /** CDN URLs for gallery images. */
  gallery: string[];

  /** CDN URLs for preview pages (e.g. first pages of a PDF). */
  previewPages: string[];

  category: ProductCategory;
  tags: string[];

  /** Languages in which the product content is available. */
  languages: Lang[];

  /**
   * Suggested audience descriptor. Free-form, e.g. "16+", "family",
   * "adults". Not an age-gate — purely informational.
   */
  recommendedAge: string | null;

  /** Human-readable audience label, e.g. "For families", "Solo evening". */
  audience: LocalizedString | null;

  /** Estimated engagement time, e.g. "1–2 hours", "30 min". */
  duration: LocalizedString | null;

  format: ProductFormat;

  /** What's included — list of items shown on the product page. */
  includedItems: LocalizedString[];

  /** Optional difficulty label, e.g. "easy", "intermediate". */
  difficulty: string | null;

  /** Whether this product should appear in featured/spotlight positions. */
  featured: boolean;

  status: ProductStatus;

  /** Manual sort order; lower = first. */
  sortOrder: number;

  // -- Commerce identifiers (provider-agnostic) --

  commerce: {
    /** ID used with the web checkout provider (e.g. Lemon Squeezy variant ID). */
    webProductId?: string;
    /** Google Play product ID for Play Billing / Digital Goods API. */
    playProductId?: string;
  };

  // -- SEO --

  seo: {
    title: LocalizedString;
    description: LocalizedString;
    /** Override for OG image; falls back to heroImage when null. */
    ogImage: string | null;
  };

  // -- Timestamps (ISO 8601) --

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Products visible to visitors: active or coming-soon. */
export function isPublicProduct(product: ShopProduct): boolean {
  return product.status === "active" || product.status === "coming-soon";
}

/** Products available for purchase. */
export function isPurchasableProduct(product: ShopProduct): boolean {
  return product.status === "active";
}
