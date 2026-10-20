import { PAYPAL_CHECKOUT_PRODUCT_ID } from "@/lib/shop/paypalCheckout";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function paypalCheckoutSessionKey(userId: string, environment: "sandbox" | "live") {
  return `laplapla:checkout:paypal:${environment}:${PAYPAL_CHECKOUT_PRODUCT_ID}:${userId}`;
}

export function getOrCreatePayPalCheckoutKey(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
  environment: "sandbox" | "live",
  createUuid: () => string,
) {
  const storageKey = paypalCheckoutSessionKey(userId, environment);
  const existing = storage.getItem(storageKey);
  if (existing && UUID_PATTERN.test(existing)) return existing;
  const created = createUuid();
  if (!UUID_PATTERN.test(created)) throw new Error("A valid checkout idempotency key is required");
  storage.setItem(storageKey, created);
  return created;
}

export function clearPayPalCheckoutKey(
  storage: Pick<Storage, "removeItem">,
  userId: string,
  environment: "sandbox" | "live",
) {
  storage.removeItem(paypalCheckoutSessionKey(userId, environment));
}
