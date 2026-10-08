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
import { requireQuestAssetUrl } from "./questAssets";
import { SOUND_CASE_001_ASSET_MANIFEST } from "./quests/sound-case-001/assets";
import { SOUND_CASE_PROMO_MEDIA } from "./soundCasePromoMedia";

const soundCaseAssets = SOUND_CASE_001_ASSET_MANIFEST.assets;
const soundCasePreviewPages = [
  requireQuestAssetUrl(soundCaseAssets["stage-1-sound-card-02-sneeze-cat"]),
  requireQuestAssetUrl(soundCaseAssets["stage-2-vibration-card-en-s"]),
  requireQuestAssetUrl(soundCaseAssets["stage-7-dune-sliding-experiment"]),
  requireQuestAssetUrl(soundCaseAssets["finale-collectible-cards"]),
];

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
    price: 4900,
    currency: "ILS",
    heroImage: SOUND_CASE_PROMO_MEDIA.banners.horizontal,
    gallery: [
      SOUND_CASE_PROMO_MEDIA.banners.square,
      SOUND_CASE_PROMO_MEDIA.banners.vertical,
    ],
    previewPages: soundCasePreviewPages,
    category: "adventures",
    tags: ["personalized", "printable", "sound", "science"],
    languages: ["ru", "en", "he"],
    recommendedAge: localizedString(
      "9+ — в основном самостоятельно; 7+ — с ведущим-взрослым.",
      "Ages 9+ mostly independently; ages 7+ with an adult host.",
      "מגיל 9 — באופן עצמאי ברובו; מגיל 7 — בליווי מבוגר או מבוגרת שמנחים את המשחק.",
    ),
    audience: localizedString("Для семьи и друзей", "For family and friends", "למשפחה ולחברים"),
    duration: localizedString(
      "Около 90–120 минут, в зависимости от размера и темпа группы.",
      "About 90–120 minutes, depending on group size and pace.",
      "כ־90–120 דקות, בהתאם לגודל הקבוצה ולקצב שלה.",
    ),
    format: "printable",
    includedItems: [
      localizedString("Персонализированные страницы A4", "Personalized A4 pages", "דפי A4 אישיים"),
      localizedString("8 этапов приключения", "8 adventure stages", "8 שלבים של הרפתקה"),
      localizedString("Карточки и улики для печати", "Printable cards and clues", "כרטיסים ורמזים להדפסה"),
      localizedString("QR-коды к интерактивным заданиям", "QR codes for interactive activities", "קודי QR למשימות אינטראקטיביות"),
      localizedString("Звуковые мини-игры и эксперименты", "Sound mini-games and experiments", "משחקוני צליל וניסויים"),
      localizedString("Персональные коллекционные карточки", "Personal collectible cards", "כרטיסי אספנות אישיים"),
    ],
    receipt: {
      title: "Sound Case #001 - LapLapLa",
      description: "A personalized printable quest for a birthday or group.",
    },
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

/** Find a product by its stable entitlement/catalog identifier. */
export function getProductById(id: string): ShopProduct | null {
  return PRODUCTS.find((product) => product.id === id) ?? null;
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
