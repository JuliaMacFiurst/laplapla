import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/lib/shop/catalog";

const db = vi.hoisted(() => ({
  entitlement: null as { id: string } | null,
  preorder: null as { eligible_price_minor: number; currency: string } | null,
  rpcResult: [{ result: "registered", created: true }] as unknown,
  rpcError: null as unknown,
  rpc: vi.fn(),
  queries: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
}));

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({
    rpc: db.rpc,
    from: (table: string) => {
      const query = { table, filters: [] as Array<[string, unknown]> };
      db.queries.push(query);
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          query.filters.push([column, value]);
          return builder;
        },
        limit: () => builder,
        maybeSingle: async () => ({
          data: table === "product_entitlements" ? db.entitlement : db.preorder,
          error: null,
        }),
      };
      return builder;
    },
  }),
}));

import {
  isValidPreorderEmail,
  normalizePreorderEmail,
  registerSoundCasePreorder,
} from "@/lib/server/productPreorders";
import { resolveProductPrice } from "@/lib/server/commerce/resolveProductPrice";

const verifiedCustomer = {
  id: "customer-a",
  email: "Maya@Example.COM",
  email_confirmed_at: "2026-09-30T00:00:00.000Z",
};

describe("preorder email and trusted registration values", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.queries.length = 0;
    db.rpcResult = [{ result: "registered", created: true }];
    db.rpcError = null;
    db.rpc.mockImplementation(async () => ({ data: db.rpcResult, error: db.rpcError }));
  });

  it("normalizes only whitespace and case", () => {
    expect(normalizePreorderEmail("  Maya+Offer@Example.COM ")).toBe("maya+offer@example.com");
    expect(isValidPreorderEmail("maya+offer@example.com")).toBe(true);
  });

  it("closes registration for the active product without deleting preorder infrastructure", async () => {
    await expect(registerSoundCasePreorder({ email: " Maya@Example.COM ", locale: "en" })).resolves.toMatchObject({ status: "closed" });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(readFileSyncSafe(`${process.cwd()}/lib/server/productPreorders.ts`)).toContain("register_product_preorder");
  });
});

describe("server-only product price resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.queries.length = 0;
    db.entitlement = null;
    db.preorder = null;
  });

  it("uses the 3900 ILS launch price for every buyer", async () => {
    expect(getProductById("sound-case-001")?.price).toBe(4900);
    await expect(resolveProductPrice({
      verifiedCustomer,
      productId: "sound-case-001",
    })).resolves.toEqual({
      status: "priced",
      productId: "sound-case-001",
      priceMinor: 3900,
      currency: "ILS",
      source: "catalog",
    });
  });

  it("uses 3900 ILS for a case-insensitive verified account email match", async () => {
    db.preorder = { eligible_price_minor: 3900, currency: "ILS" };
    await expect(resolveProductPrice({
      verifiedCustomer,
      productId: "sound-case-001",
    })).resolves.toEqual({
      status: "priced",
      productId: "sound-case-001",
      priceMinor: 3900,
      currency: "ILS",
      source: "catalog",
    });
    expect(db.queries.some((query) => query.table === "product_preorders")).toBe(false);
  });

  it.each([
    { ...verifiedCustomer, email: undefined },
    { ...verifiedCustomer, email_confirmed_at: undefined },
  ])("applies the public launch offer without a verified account email", async (customer) => {
    db.preorder = { eligible_price_minor: 3900, currency: "ILS" };
    const result = await resolveProductPrice({
      verifiedCustomer: customer,
      productId: "sound-case-001",
    });
    expect(result).toMatchObject({ priceMinor: 3900, source: "catalog" });
    expect(db.queries.some((query) => query.table === "product_preorders")).toBe(false);
  });

  it("returns already_owned before resolving any preorder price", async () => {
    db.entitlement = { id: "entitlement-a" };
    await expect(resolveProductPrice({
      verifiedCustomer,
      productId: "sound-case-001",
    })).resolves.toEqual({ status: "already_owned", productId: "sound-case-001" });
    expect(db.queries.some((query) => query.table === "product_preorders")).toBe(false);
  });

  it("does not accept a browser price or a PayPal email in its input contract", () => {
    const source = readFileSyncSafe(`${process.cwd()}/lib/server/commerce/resolveProductPrice.ts`);
    expect(source).not.toMatch(/paypal/i);
    expect(source).not.toMatch(/browser.*price|query.*price|localStorage/i);
    expect(source).toContain("getProductPrice(product).currentMinor");
  });

  it("does not give old preorder records a separate price while the launch offer is active", async () => {
    db.preorder = { eligible_price_minor: 3900, currency: "ILS" };
    const result = await resolveProductPrice({
      verifiedCustomer,
      productId: "sound-case-001",
    });
    expect(result).toMatchObject({ priceMinor: 3900, source: "catalog" });
    const source = readFileSyncSafe(`${process.cwd()}/lib/server/commerce/resolveProductPrice.ts`);
    expect(source).not.toContain("product_preorder_offers");
  });
});

function readFileSyncSafe(path: string) {
  return readFileSync(path, "utf8");
}
