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
import { isPublicProduct, isPurchasableProduct, localizedString } from "./types";

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const PRODUCTS: ShopProduct[] = [
  {
    id: "sound-case-001",
    slug: "sound-case-001",
    title: localizedString("Дело о звуке № 001", "Sound Case #001", "תיק הצלילים מס׳ 001"),
    subtitle: localizedString(
      "Тайна вибраций, резонанса и поющих песков",
      "The mystery of vibrations, resonance, and singing sands",
      "תעלומת הרעידות, התהודה והחולות המזמרים",
    ),
    shortDescription: localizedString(
      "Персонализированный печатный квест для дня рождения или компании.",
      "A personalized printable quest for a birthday or group.",
      "משימת הרפתקה אישית להדפסה ליום הולדת או לקבוצה.",
    ),
    longDescription: localizedString(
      "Участники расследуют загадочные звуки и знакомятся с вибрацией и резонансом через игру.",
      "Participants investigate mysterious sounds and discover vibration and resonance through play.",
      "המשתתפים חוקרים צלילים מסתוריים ומגלים רעידות ותהודה דרך משחק.",
    ),
    price: 0,
    currency: "ILS",
    heroImage: "",
    gallery: [],
    previewPages: [],
    category: "adventures",
    tags: ["personalized", "printable", "sound", "science"],
    languages: ["ru", "en", "he"],
    recommendedAge: null,
    audience: localizedString("Для семьи и друзей", "For family and friends", "למשפחה ולחברים"),
    duration: null,
    format: "printable",
    includedItems: [
      localizedString("Персонализированные страницы A4", "Personalized A4 pages", "דפי A4 אישיים"),
    ],
    difficulty: null,
    featured: true,
    status: "coming-soon",
    sortOrder: 1,
    commerce: {},
    seo: {
      title: localizedString("Дело о звуке № 001", "Sound Case #001", "תיק הצלילים מס׳ 001"),
      description: localizedString(
        "Прототип персонализированного печатного квеста LapLapLa.",
        "A prototype personalized printable quest from LapLapLa.",
        "אב־טיפוס של משימת הרפתקה אישית להדפסה מבית LapLapLa.",
      ),
      ogImage: null,
    },
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  },
];

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
