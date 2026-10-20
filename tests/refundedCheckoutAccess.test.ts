import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ activeLookup: vi.fn(), filters: [] as Array<[string, unknown]> }));
vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => {
      if (table !== "product_entitlements") throw new Error(`Unexpected table: ${table}`);
      const chain = {
        select: () => chain,
        eq: (field: string, value: unknown) => { state.filters.push([field, value]); return chain; },
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => state.activeLookup(),
      };
      return chain;
    },
  }),
}));

import { resolveProductPrice } from "@/lib/server/commerce/resolveProductPrice";
import { getActiveCustomerProductEntitlement } from "@/lib/server/questPersonalizations";

describe("refunded access and repeat purchase", () => {
  beforeEach(() => { state.filters = []; state.activeLookup.mockReset(); state.activeLookup.mockResolvedValue({ data: null, error: null }); });

  it("allows checkout when the old entitlement is no longer active", async () => {
    const quote = await resolveProductPrice({ verifiedCustomer: { id: "buyer", email: undefined, email_confirmed_at: undefined }, productId: "sound-case-001" });
    expect(quote.status).toBe("priced");
    expect(state.filters).toContainEqual(["status", "active"]);
  });

  it("denies builder personalization access while entitlement is refunded", async () => {
    const entitlement = await getActiveCustomerProductEntitlement("token", "buyer", "sound-case-001");
    expect(entitlement).toBeNull();
    expect(state.filters).toContainEqual(["status", "active"]);
  });
});
