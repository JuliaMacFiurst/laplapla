import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveProductPrice: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/server/commerce/resolveProductPrice", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/commerce/resolveProductPrice")>();
  return { ...original, resolveProductPrice: mocks.resolveProductPrice };
});

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({ rpc: mocks.rpc }),
}));

import { createLocalCommerceOrder } from "@/lib/server/commerce/orders";
import { finalizeLocalOrderPaid } from "@/lib/server/commerce/finalizePaidOrder";
import {
  claimPaymentProviderEvent,
  setPaymentProviderEventStatus,
} from "@/lib/server/commerce/providerEvents";

const customer = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "customer@example.com",
  email_confirmed_at: "2026-10-01T00:00:00.000Z",
};
const checkoutIdempotencyKey = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function orderRow(overrides: Record<string, unknown> = {}) {
  return [{
    checkout_result: "created",
    order_id: "order-1",
    order_item_id: "item-1",
    created: true,
    order_status: "creating",
    total_minor: 4900,
    currency: "ILS",
    price_source: "catalog",
    offer_code: null,
    paypal_create_request_id: "create-request",
    paypal_capture_request_id: "capture-request",
    ...overrides,
  }];
}

describe("trusted local commerce order creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveProductPrice.mockResolvedValue({
      status: "priced",
      productId: "sound-case-001",
      priceMinor: 4900,
      currency: "ILS",
      source: "catalog",
    });
    mocks.rpc.mockResolvedValue({ data: orderRow(), error: null });
  });

  it("snapshots the server-resolved 4900 ILS catalog price", async () => {
    const result = await createLocalCommerceOrder({
      verifiedCustomer: customer,
      productId: "sound-case-001",
      checkoutIdempotencyKey,
    });
    expect(result).toMatchObject({
      status: "order",
      order: { totalMinor: 4900, currency: "ILS", priceSource: "catalog", offerCode: null },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("resolve_paypal_commerce_checkout", expect.objectContaining({
      target_user_id: customer.id,
      target_product_id: "sound-case-001",
      target_total_minor: 4900,
      target_currency: "ILS",
      target_price_source: "catalog",
      target_offer_code: null,
      target_checkout_idempotency_key: checkoutIdempotencyKey,
    }));
  });

  it("snapshots the server-resolved 3900 ILS preorder price and offer", async () => {
    mocks.resolveProductPrice.mockResolvedValue({
      status: "priced",
      productId: "sound-case-001",
      priceMinor: 3900,
      currency: "ILS",
      source: "preorder",
    });
    mocks.rpc.mockResolvedValue({ data: orderRow({
      total_minor: 3900,
      price_source: "preorder",
      offer_code: "sound-case-001-preorder",
    }), error: null });

    const result = await createLocalCommerceOrder({
      verifiedCustomer: customer,
      productId: "sound-case-001",
      checkoutIdempotencyKey,
    });
    expect(result).toMatchObject({
      status: "order",
      order: {
        totalMinor: 3900,
        priceSource: "preorder",
        offerCode: "sound-case-001-preorder",
      },
    });
  });

  it("replays the existing immutable snapshot for an idempotent retry", async () => {
    mocks.rpc.mockResolvedValue({ data: orderRow({ checkout_result: "resumed", created: false }), error: null });
    const first = await createLocalCommerceOrder({
      verifiedCustomer: customer,
      productId: "sound-case-001",
      checkoutIdempotencyKey,
    });
    mocks.resolveProductPrice.mockResolvedValue({
      status: "priced",
      productId: "sound-case-001",
      priceMinor: 9900,
      currency: "ILS",
      source: "catalog",
    });
    const retry = await createLocalCommerceOrder({
      verifiedCustomer: customer,
      productId: "sound-case-001",
      checkoutIdempotencyKey,
    });
    expect(first).toEqual(retry);
    expect(retry).toMatchObject({ status: "order", order: { totalMinor: 4900, created: false } });
  });

  it("returns an explicit reconciliation state instead of choosing between duplicate checkouts", async () => {
    mocks.rpc.mockResolvedValue({
      data: orderRow({
        checkout_result: "needs_reconciliation",
        order_id: null,
        order_item_id: null,
        order_status: null,
        total_minor: null,
      }),
      error: null,
    });
    await expect(createLocalCommerceOrder({
      verifiedCustomer: customer,
      productId: "sound-case-001",
      checkoutIdempotencyKey,
    })).resolves.toEqual({ status: "needs_reconciliation", productId: "sound-case-001" });
  });

  it("has no browser-controlled amount in its input contract", () => {
    const source = readFileSync(`${process.cwd()}/lib/server/commerce/orders.ts`, "utf8");
    expect(source).toContain("resolveProductPrice");
    expect(source).not.toMatch(/input\.(?:price|amount|currency)/);
    expect(source).not.toContain("localStorage");
  });
});

describe("paid order and provider event server helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes only verified payment facts to the atomic finalizer", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ result: "paid", finalized_order_id: "order-1", finalized_entitlement_id: "entitlement-1" }],
      error: null,
    });
    await expect(finalizeLocalOrderPaid({
      orderId: "order-1",
      provider: "paypal",
      providerOrderId: "PAYPAL-ORDER-1",
      providerCaptureId: "PAYPAL-CAPTURE-1",
      confirmedAmountMinor: 4900,
      confirmedCurrency: "ILS",
    })).resolves.toEqual({ result: "paid", orderId: "order-1", entitlementId: "entitlement-1" });
    expect(mocks.rpc).toHaveBeenCalledWith("finalize_commerce_order_paid", {
      target_order_id: "order-1",
      target_provider: "paypal",
      target_provider_order_id: "PAYPAL-ORDER-1",
      target_provider_capture_id: "PAYPAL-CAPTURE-1",
      target_confirmed_amount_minor: 4900,
      target_confirmed_currency: "ILS",
      target_provider_event_record_id: null,
    });
  });

  it("hashes rather than stores or returns the provider payload", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        event_id: "event-record-1",
        claim_status: "claimed",
        claimed: true,
        duplicate: false,
        event_status: "processing",
      }],
      error: null,
    });
    const result = await claimPaymentProviderEvent({
      provider: "paypal",
      providerEventId: "WH-1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      rawPayload: "provider-payload-without-pii",
    });
    expect(result.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mocks.rpc).toHaveBeenCalledWith("claim_payment_provider_event", expect.objectContaining({
      target_payload_hash: result.payloadHash,
    }));
    expect(JSON.stringify(result)).not.toContain("provider-payload-without-pii");
  });

  it("exposes duplicate claims without invoking business finalization", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        event_id: "event-record-1",
        claim_status: "duplicate",
        claimed: false,
        duplicate: true,
        event_status: "processed",
      }],
      error: null,
    });
    const result = await claimPaymentProviderEvent({
      provider: "paypal",
      providerEventId: "WH-1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      rawPayload: "same-payload",
    });
    expect(result).toMatchObject({ claimed: false, duplicate: true, claimStatus: "duplicate" });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalledWith("finalize_commerce_order_paid", expect.anything());
  });

  it("updates provider event status through the trusted RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ result: "updated", event_status: "failed" }], error: null });
    await expect(setPaymentProviderEventStatus({
      eventId: "event-record-1",
      status: "failed",
      failureCode: "provider_rejected",
    })).resolves.toEqual({ result: "updated", status: "failed" });
  });
});

describe("commerce migration security and replay invariants", () => {
  const migration = readFileSync(
    `${process.cwd()}/supabase/migrations/202610010001_create_commerce_order_foundation.sql`,
    "utf8",
  );

  it("keeps commerce tables and RPC mutations away from browser roles", () => {
    for (const table of ["orders", "order_items", "payment_provider_events"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on table public.${table} from public, anon, authenticated`);
    }
    expect(migration).toMatch(/revoke all on function public\.finalize_commerce_order_paid[\s\S]*from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.finalize_commerce_order_paid[\s\S]*to service_role/);
  });

  it("uses safe search paths and exits paid replays before entitlement grant", () => {
    expect(migration.match(/security definer\nset search_path = public, pg_temp/g)?.length).toBe(4);
    const paidReplay = migration.indexOf("if commerce_order.status = 'paid' then");
    const entitlementGrant = migration.indexOf("public.grant_product_entitlement(");
    expect(paidReplay).toBeGreaterThan(-1);
    expect(entitlementGrant).toBeGreaterThan(paidReplay);
    expect(migration.slice(paidReplay, entitlementGrant)).toContain("return query select 'already_paid'");
  });

  it("keeps payment analytics and credentials out of Slice 1", () => {
    expect(migration).not.toMatch(/'checkout_started'|'order_paid'|'payment_failed'|client_secret|access_token/i);
  });
});

describe("PayPal provider-order binding migration", () => {
  const migration = readFileSync(
    `${process.cwd()}/supabase/migrations/202610010002_bind_paypal_checkout_orders.sql`,
    "utf8",
  );

  it("keeps provider binding and capture transitions service-role only", () => {
    for (const signature of [
      "bind_paypal_order_to_commerce_order(uuid, text)",
      "begin_paypal_commerce_order_capture(uuid, uuid, text)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature}`);
      expect(migration).toContain(`grant execute on function public.${signature}`);
    }
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration.match(/security definer\nset search_path = public, pg_temp/g)).toHaveLength(2);
  });

  it("locks orders and makes same-id retries safe while rejecting conflicts", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("'already_bound'::text");
    expect(migration).toContain("'provider_order_conflict'::text");
    expect(migration).toContain("status = 'pending_approval'");
    expect(migration).toContain("status = 'capture_pending'");
  });
});

describe("PayPal checkout recovery migration", () => {
  const migration = readFileSync(
    `${process.cwd()}/supabase/migrations/202610010003_add_paypal_checkout_recovery.sql`,
    "utf8",
  );

  it("serializes customer/product checkout creation and exposes ambiguity", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("'paypal-checkout:' || target_user_id::text || ':' || target_product_id");
    expect(migration).toContain("'needs_reconciliation'::text");
    expect(migration).toContain("status in ('creating', 'pending_approval', 'capture_pending')");
  });

  it("is service-role-only with a fixed safe search path", () => {
    expect(migration).toContain("security definer\nset search_path = public, pg_temp");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
