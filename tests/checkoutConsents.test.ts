import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => mocks.db }));

import { recordCheckoutConsents } from "@/lib/server/commerce/checkoutConsents";
import { CHECKOUT_CONSENT_VERSIONS } from "@/lib/legal/checkoutConsent";

const consent = {
  order_id: "order-1", user_id: "user-1", locale: "ru",
  terms_of_sale_version: CHECKOUT_CONSENT_VERSIONS.termsOfSale,
  refund_policy_version: CHECKOUT_CONSENT_VERSIONS.refundPolicy,
  printable_license_version: CHECKOUT_CONSENT_VERSIONS.printableLicense,
  electronic_receipt_consent_version: CHECKOUT_CONSENT_VERSIONS.electronicReceipt,
};

function database(initial: Record<string, unknown> | null = null) {
  let saved = initial;
  let successfulInserts = 0;
  const maybeSingle = vi.fn(async () => ({ data: saved, error: null }));
  const insert = vi.fn(async (row: Record<string, unknown>) => {
    if (saved) {
      // A concurrent order can already be capture_pending: its BEFORE INSERT
      // trigger rejects before PostgreSQL checks the unique constraint.
      return { error: { code: "P0001", message: "Checkout consent must precede payment for the same customer" } };
    }
    saved = row;
    successfulInserts += 1;
    return { error: null };
  });
  return {
    insert, maybeSingle,
    get saved() { return saved; },
    get successfulInserts() { return successfulInserts; },
    api: { from: () => ({ insert, select: () => ({ eq: () => ({ maybeSingle }) }) }) },
  };
}

describe("immutable checkout consent evidence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records both consents and all document versions against a new order", async () => {
    const db = database(); mocks.db = db.api;
    await recordCheckoutConsents({ orderId: "order-1", userId: "user-1", lang: "he" });
    expect(db.saved).toEqual({ ...consent, locale: "he" });
    expect(db.successfulInserts).toBe(1);
  });

  it("reuses existing evidence without INSERT when checkout is resumed", async () => {
    const db = database(consent); mocks.db = db.api;
    await recordCheckoutConsents({ orderId: "order-1", userId: "user-1", lang: "en" });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.saved).toEqual(consent);
  });

  it("rejects a consent record bound to another customer", async () => {
    const db = database(consent); mocks.db = db.api;
    await expect(recordCheckoutConsents({ orderId: "order-1", userId: "user-2", lang: "ru" }))
      .rejects.toThrow("Checkout consent version mismatch");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("accepts the first request's evidence when a concurrent INSERT hits the SQL trigger", async () => {
    const db = database(); mocks.db = db.api;
    await Promise.all([
      recordCheckoutConsents({ orderId: "order-1", userId: "user-1", lang: "ru" }),
      recordCheckoutConsents({ orderId: "order-1", userId: "user-1", lang: "en" }),
    ]);
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.successfulInserts).toBe(1);
    expect(db.saved).toEqual(consent);
  });

  it("fails closed when the trigger rejects an INSERT with no prior consent", async () => {
    const db = database(); mocks.db = db.api;
    db.insert.mockResolvedValue({ error: { code: "P0001", message: "Checkout consent must precede payment for the same customer" } });
    await expect(recordCheckoutConsents({ orderId: "order-1", userId: "user-1", lang: "ru" }))
      .rejects.toMatchObject({ code: "P0001" });
    expect(db.successfulInserts).toBe(0);
  });
});
