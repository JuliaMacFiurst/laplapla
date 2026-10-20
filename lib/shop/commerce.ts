/**
 * LapLapLa Shop — Commerce abstraction layer.
 *
 * Defines a provider-agnostic interface for checkout flows.
 * Phase 1A ships with a stub adapter that always returns "unavailable".
 * Future adapters:
 *   - ExternalCheckoutAdapter  (Lemon Squeezy / Stripe / Payhip)
 *   - PlayBillingAdapter       (Google Play Billing via Digital Goods API)
 *
 * Product knows WHAT is sold; the adapter knows HOW it is purchased.
 * The UI calls `resolveCheckoutAction()` to get the right behavior
 * for the current runtime environment.
 */

import type { Lang } from "@/i18n";
import type { ShopProduct } from "./types";
import type { CommerceEnvironment } from "./environment";

// ---------------------------------------------------------------------------
// Checkout types
// ---------------------------------------------------------------------------

export interface CheckoutRequest {
  product: ShopProduct;
  environment: CommerceEnvironment;
  lang: Lang;
  /** UTM / referrer data (session-scoped, privacy-safe). */
  campaignSource?: string | null;
  campaignMedium?: string | null;
  campaignId?: string | null;
}

export type CheckoutActionType =
  | "redirect"   // Open an external checkout URL
  | "in-app"     // In-app purchase (future Play Billing)
  | "unavailable"; // No checkout available yet

export interface CheckoutAction {
  type: CheckoutActionType;
  /** External URL to redirect to (only when type === "redirect"). */
  url?: string;
  /** Human-readable reason when unavailable. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface CommerceAdapter {
  /** Human-readable adapter name for diagnostics. */
  readonly name: string;

  /** Whether this adapter can handle the given environment. */
  isAvailable(env: CommerceEnvironment): boolean;

  /** Resolve the checkout action for a product. */
  resolveCheckout(request: CheckoutRequest): CheckoutAction;
}

// ---------------------------------------------------------------------------
// Stub adapter — Phase 1A: no real payments
// ---------------------------------------------------------------------------

const stubAdapter: CommerceAdapter = {
  name: "stub",

  isAvailable(): boolean {
    return true; // Always matches — it's the fallback
  },

  resolveCheckout(): CheckoutAction {
    return {
      type: "unavailable",
      reason: "Shop is preparing its first collections. Check back soon!",
    };
  },
};

// ---------------------------------------------------------------------------
// Adapter resolution
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate checkout action for a product in the
 * current runtime environment.
 *
 * Future: this function will iterate over registered adapters
 * and pick the first one that matches the environment.
 * For now it always returns the stub.
 */
export function resolveCheckoutAction(
  request: CheckoutRequest,
): CheckoutAction {
  // In future: iterate adapters, find first available for env
  return stubAdapter.resolveCheckout(request);
}

/**
 * Format a product price for display.
 * Does not depend on the commerce adapter — purely presentational.
 */
export function formatPrice(
  price: number,
  currency: string,
  lang: Lang,
): string {
  if (price === 0) return lang === "ru" ? "Бесплатно" : lang === "he" ? "חינם" : "Free";

  const amount = price / 100; // price is stored in smallest unit
  const locale = lang === "he" ? "he-IL" : lang === "en" ? "en-US" : "ru-RU";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
