import { describe, expect, it } from "vitest";
import {
  clearPayPalCheckoutKey,
  getOrCreatePayPalCheckoutKey,
  paypalCheckoutSessionKey,
} from "@/lib/shop/paypalCheckoutSession";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe("PayPal checkout session idempotency", () => {
  it("preserves the key across remount/reload-style reads in the same session", () => {
    const storage = memoryStorage();
    const userId = "11111111-1111-4111-8111-111111111111";
    const first = getOrCreatePayPalCheckoutKey(
      storage,
      userId,
      "sandbox",
      () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    const afterRemount = getOrCreatePayPalCheckoutKey(
      storage,
      userId,
      "sandbox",
      () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(afterRemount).toBe(first);
  });

  it("scopes checkout keys by customer, product, provider and environment", () => {
    expect(paypalCheckoutSessionKey("customer-a", "sandbox")).toContain("paypal:sandbox:sound-case-001:customer-a");
    expect(paypalCheckoutSessionKey("customer-b", "sandbox")).not.toBe(paypalCheckoutSessionKey("customer-a", "sandbox"));
    expect(paypalCheckoutSessionKey("customer-a", "live")).not.toBe(paypalCheckoutSessionKey("customer-a", "sandbox"));
  });

  it("clears the key only after a terminal successful result", () => {
    const storage = memoryStorage();
    const userId = "11111111-1111-4111-8111-111111111111";
    getOrCreatePayPalCheckoutKey(storage, userId, "sandbox", () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    clearPayPalCheckoutKey(storage, userId, "sandbox");
    expect(storage.getItem(paypalCheckoutSessionKey(userId, "sandbox"))).toBeNull();
  });
});
