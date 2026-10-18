import type { Lang } from "@/i18n";
import type { ShopProduct } from "./types";

// Set to false to restore the regular 49 ₪ price for new checkouts and storefronts.
export const SOUND_CASE_LAUNCH_OFFER_ENABLED = true;
const SOUND_CASE_LAUNCH_PRICE_MINOR = 3900;

export function getProductPrice(product: Pick<ShopProduct, "id" | "price" | "status">, enabled = SOUND_CASE_LAUNCH_OFFER_ENABLED) {
  const promotional = product.id === "sound-case-001" && product.status === "active" && enabled;
  return {
    regularMinor: product.price,
    currentMinor: promotional ? SOUND_CASE_LAUNCH_PRICE_MINOR : product.price,
    savingsMinor: promotional ? product.price - SOUND_CASE_LAUNCH_PRICE_MINOR : 0,
    promotional,
  };
}

export function getQuotedLaunchOffer(
  product: Pick<ShopProduct, "id" | "price" | "status" | "currency">,
  quote: { amountMinor: number; currency: string },
  enabled = SOUND_CASE_LAUNCH_OFFER_ENABLED,
) {
  const price = getProductPrice(product, enabled);
  return price.promotional && quote.currency === product.currency && quote.amountMinor === price.currentMinor
    ? price
    : null;
}

export const LAUNCH_OFFER_COPY: Record<Lang, { badge: string; savings: string; regular: string; buy: string; available: string }> = {
  ru: { badge: "Стартовая акция", savings: "Скидка 10 ₪", regular: "Обычная цена", buy: "Купить", available: "Доступно для покупки" },
  en: { badge: "Launch offer", savings: "Save ₪10", regular: "Regular price", buy: "Buy now", available: "Available to buy" },
  he: { badge: "מבצע השקה", savings: "הנחה של ₪10", regular: "מחיר רגיל", buy: "קנייה עכשיו", available: "זמין לרכישה" },
};
