import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => mocks.client }));

import { downloadOwnReceiptOriginal, getCustomerPurchases } from "@/lib/server/customerPurchases";
import type { ProductEntitlement } from "@/lib/customer/types";

function builder(result: { data: unknown; error: unknown }, calls: Array<[string, unknown]>) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "in", "order", "limit"]) chain[method] = (...args: unknown[]) => { calls.push([method, args]); return chain; };
  chain.maybeSingle = async () => result;
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function client(rows: Record<string, { data: unknown; error: unknown }>, blob?: Blob) {
  const calls: Record<string, Array<[string, unknown]>> = {};
  const storageCalls: Array<[string, string]> = [];
  return {
    calls, storageCalls,
    api: {
      from(table: string) { calls[table] ??= []; return builder(rows[table] ?? { data: [], error: null }, calls[table]); },
      storage: { from(bucket: string) { return { async download(key: string) { storageCalls.push([bucket, key]); return { data: blob ?? null, error: blob ? null : new Error("missing") }; } }; } },
    },
  };
}

const entitlement: ProductEntitlement = { id: "ent-1", user_id: "user-1", product_id: "sound-case-001", source: "laplapla_web", status: "active", granted_at: "2026-10-08T10:00:00Z", created_at: "2026-10-08T10:00:00Z", updated_at: "2026-10-08T10:00:00Z" };
const order = { id: "order-1", status: "paid", total_minor: 4900, currency: "ILS", paid_at: "2026-10-08T10:00:00Z", created_at: "2026-10-08T09:00:00Z", provider_environment: "live", order_items: { product_id: "sound-case-001", product_title_snapshot: "Sound Case #001 - LapLapLa", entitlement_id: "ent-1", product_entitlements: { status: "active" } } };

describe("customer purchase history aggregation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps an own paid order with active access and ready original receipt", async () => {
    const fake = client({ orders: { data: [order], error: null }, receipts: { data: [{ id: "receipt-1", order_id: "order-1", receipt_number: 1, receipt_series: { series_code: "WEB" } }], error: null }, receipt_artifacts: { data: [{ receipt_id: "receipt-1", status: "ready" }], error: null } });
    mocks.client = fake.api;
    const result = await getCustomerPurchases("user-1", [entitlement]);
    expect(result.purchases).toEqual([expect.objectContaining({ orderId: "order-1", paymentStatus: "paid", accessStatus: "active", receipt: { status: "available", displayNumber: "WEB-000001" } })]);
    expect(result.accessGrants).toEqual([]);
    expect(fake.calls.orders).toContainEqual(["eq", ["user_id", "user-1"]]);
  });

  it("keeps promo access without inventing payment or receipt data", async () => {
    const promo = { ...entitlement, id: "promo-1", source: "promo" as const };
    const fake = client({ orders: { data: [], error: null } }); mocks.client = fake.api;
    const result = await getCustomerPurchases("user-1", [promo]);
    expect(result.purchases).toEqual([]);
    expect(result.accessGrants).toEqual([{ entitlementId: "promo-1", productId: "sound-case-001", source: "promo", status: "active", grantedAt: promo.granted_at }]);
  });

  it("handles pending original, missing receipt, and legacy orders without exposing business copy", async () => {
    const pendingFake = client({ orders: { data: [order], error: null }, receipts: { data: [{ id: "receipt-1", order_id: "order-1", receipt_number: 1, receipt_series: { series_code: "WEB" } }], error: null }, receipt_artifacts: { data: [{ receipt_id: "receipt-1", status: "processing" }], error: null } });
    mocks.client = pendingFake.api;
    expect((await getCustomerPurchases("user-1", [entitlement])).purchases[0]?.receipt.status).toBe("preparing");
    const legacyFake = client({ orders: { data: [{ ...order, provider_environment: null }], error: null }, receipts: { data: [], error: null } });
    mocks.client = legacyFake.api;
    expect((await getCustomerPurchases("user-1", [entitlement])).purchases[0]?.receipt.status).toBe("not_available");
    const source = readFileSync(`${process.cwd()}/lib/server/customerPurchases.ts`, "utf8");
    expect(source).toContain('.eq("document_copy", "original")');
    expect(source).not.toContain('.eq("document_copy", "copy")');
  });
});

describe("customer receipt storage ownership", () => {
  it("resolves own order, original artifact, and private key entirely server-side", async () => {
    const fake = client({
      orders: { data: { id: "order-1" }, error: null },
      receipts: { data: { id: "receipt-1", receipt_number: 1, receipt_series: { series_code: "WEB" } }, error: null },
      receipt_artifacts: { data: { status: "ready", storage_bucket: "receipt-pdfs", storage_key: "receipts/receipt-1/original/artifact.pdf", content_type: "application/pdf" }, error: null },
    }, new Blob(["pdf"], { type: "application/pdf" }));
    mocks.client = fake.api;
    const result = await downloadOwnReceiptOriginal("user-1", "order-1");
    expect(result).toEqual(expect.objectContaining({ status: "ready", fileName: "receipt-WEB-000001.pdf" }));
    expect(fake.calls.orders).toContainEqual(["eq", ["user_id", "user-1"]]);
    expect(fake.calls.receipt_artifacts).toContainEqual(["eq", ["document_copy", "original"]]);
    expect(fake.storageCalls).toEqual([["receipt-pdfs", "receipts/receipt-1/original/artifact.pdf"]]);
  });

  it("stops before receipt and Storage lookup when the order is not owned", async () => {
    const fake = client({ orders: { data: null, error: null } }); mocks.client = fake.api;
    expect(await downloadOwnReceiptOriginal("user-1", "foreign-order")).toEqual({ status: "not_found" });
    expect(fake.calls.receipts).toBeUndefined();
    expect(fake.storageCalls).toEqual([]);
  });
});

describe("account purchase UI", () => {
  it("contains localized purchase, re-print, promo, and receipt copy in all languages", () => {
    const copySource = readFileSync(`${process.cwd()}/lib/customer/copy.ts`, "utf8");
    const accountSource = readFileSync(`${process.cwd()}/pages/account/index.tsx`, "utf8");
    expect(copySource).toContain("Открыть, изменить и распечатать");
    expect(copySource).toContain("Open, edit & print again");
    expect(copySource).toContain("פתיחה, עריכה והדפסה מחדש");
    expect(accountSource).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(accountSource).toContain("purchase.amountMinor");
    expect(accountSource).toContain("purchase.purchasedAt");
    expect(accountSource).toContain("copy.reprintHelp");
    expect(accountSource).toContain("copy.downloadReceipt");
    expect(accountSource).toContain("copy.accessWithoutPurchase");
  });
});
