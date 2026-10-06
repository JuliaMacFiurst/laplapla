import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const mocks = vi.hoisted(() => ({
  resolveAdminAccess: vi.fn(),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
}));

vi.mock("@/lib/server/auth/adminAccess", () => ({ resolveAdminAccess: mocks.resolveAdminAccess }));
vi.mock("@/lib/server/admin/commerce", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/admin/commerce")>();
  return {
    ...original,
    listAdminCommerceOrders: mocks.listOrders,
    getAdminCommerceOrderDetail: mocks.getOrder,
  };
});

import { adminCommerceOrdersHandler } from "@/pages/api/admin/commerce/orders";
import { adminCommerceOrderDetailHandler } from "@/pages/api/admin/commerce/orders/[orderId]";
import {
  ADMIN_COMMERCE_MAX_PAGE_SIZE,
  deriveAdminCommerceReviewState,
  mapAdminCommerceOrder,
  matchesAdminCommerceFilters,
  normalizeAdminCommerceListFilters,
  paginateAdminCommerceOrders,
  personalizationLocale,
  sanitizeProviderEvents,
} from "@/lib/server/admin/commerce";

const orderId = "11111111-1111-4111-8111-111111111111";

function request(query: NextApiRequest["query"] = {}) {
  return { method: "GET", query, headers: {}, cookies: {}, socket: {} } as unknown as NextApiRequest;
}

function response() {
  const result = { status: 200, body: null as unknown };
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader: vi.fn(),
    status: vi.fn((status: number) => { result.status = status; res.statusCode = status; return res; }),
    json: vi.fn((body: unknown) => { result.body = body; return res; }),
  } as unknown as NextApiResponse;
  return { res, result };
}

function rawOrder(overrides: Record<string, unknown> = {}): Parameters<typeof mapAdminCommerceOrder>[0] {
  return {
    id: orderId,
    user_id: "22222222-2222-4222-8222-222222222222",
    provider: "paypal",
    status: "paid",
    currency: "ILS",
    total_minor: 4900,
    provider_order_id: "PAYPAL-ORDER",
    provider_capture_id: "PAYPAL-CAPTURE",
    paid_at: "2026-10-06T12:00:00.000Z",
    failure_code: null,
    created_at: "2026-10-06T11:00:00.000Z",
    updated_at: "2026-10-06T12:00:00.000Z",
    order_items: [{
      id: "33333333-3333-4333-8333-333333333333",
      product_id: "sound-case-001",
      quantity: 1,
      unit_price_minor: 4900,
      currency: "ILS",
      price_source: "catalog",
      offer_code: null,
      entitlement_id: "44444444-4444-4444-8444-444444444444",
      product_entitlements: {
        id: "44444444-4444-4444-8444-444444444444",
        status: "active",
        source: "laplapla_web",
        granted_at: "2026-10-06T12:00:00.000Z",
      },
    }],
    ...overrides,
  } as Parameters<typeof mapAdminCommerceOrder>[0];
}

describe("Commerce Admin API authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous and authenticated non-admin users", async () => {
    mocks.resolveAdminAccess.mockResolvedValueOnce({ isAdmin: false, isAuthenticated: false });
    const anonymous = response();
    await adminCommerceOrdersHandler(request(), anonymous.res);
    expect(anonymous.result.status).toBe(401);

    mocks.resolveAdminAccess.mockResolvedValueOnce({ isAdmin: false, isAuthenticated: true });
    const customer = response();
    await adminCommerceOrdersHandler(request(), customer.res);
    expect(customer.result.status).toBe(403);
    expect(mocks.listOrders).not.toHaveBeenCalled();
  });

  it("accepts a verified admin and returns only the purpose-built DTO", async () => {
    mocks.resolveAdminAccess.mockResolvedValue({ isAdmin: true, isAuthenticated: true });
    mocks.listOrders.mockResolvedValue({ orders: [], page: 1, pageSize: 25 });
    const target = response();
    await adminCommerceOrdersHandler(request(), target.res);
    expect(target.result.status).toBe(200);
    expect(JSON.stringify(target.result.body)).not.toMatch(/service.role|client.secret|raw.payload/i);
  });

  it("returns 404 for a missing order and validates identifiers", async () => {
    mocks.resolveAdminAccess.mockResolvedValue({ isAdmin: true, isAuthenticated: true });
    mocks.getOrder.mockResolvedValue(null);
    const missing = response();
    await adminCommerceOrderDetailHandler(request({ orderId }), missing.res);
    expect(missing.result.status).toBe(404);

    const invalid = response();
    await adminCommerceOrderDetailHandler(request({ orderId: "not-a-uuid" }), invalid.res);
    expect(invalid.result.status).toBe(400);
  });
});

describe("Commerce Admin mapping", () => {
  it("maps a paid order, email, catalog product and active entitlement", () => {
    const mapped = mapAdminCommerceOrder(rawOrder(), "customer@example.com");
    expect(mapped).toMatchObject({
      customer: { email: "customer@example.com", name: null, nameState: "not_collected" },
      item: { productName: "Sound Case #001", productNameSource: "current_catalog" },
      status: "paid",
      entitlement: { status: "active", source: "laplapla_web" },
      environment: "unknown",
      reviewState: "ok",
    });
  });

  it("uses safe fallbacks for missing email and a removed catalog product", () => {
    const row = rawOrder();
    const item = (row.order_items as Array<Record<string, unknown>>)[0];
    item.product_id = "retired-product";
    const mapped = mapAdminCommerceOrder(row, null);
    expect(mapped).toMatchObject({
      customer: { email: null, nameState: "not_collected" },
      item: { productName: "retired-product", productNameSource: "product_id_fallback" },
    });
  });

  it("flags a paid order without entitlement and failed payments", () => {
    const missingEntitlement = rawOrder();
    const item = (missingEntitlement.order_items as Array<Record<string, unknown>>)[0];
    item.entitlement_id = null;
    item.product_entitlements = null;
    expect(mapAdminCommerceOrder(missingEntitlement, "buyer@example.com")).toMatchObject({
      reviewState: "needs_review",
      reviewReasons: ["paid_without_entitlement"],
    });
    expect(deriveAdminCommerceReviewState({
      status: "failed", failureCode: "provider_error", createdAt: "2026-10-06T00:00:00Z", entitlement: null,
    })).toMatchObject({ reviewState: "needs_review", reviewReasons: ["payment_failure"] });
  });

  it("classifies fresh and stale capture work conservatively", () => {
    expect(deriveAdminCommerceReviewState({
      status: "capture_pending", failureCode: null, createdAt: "2026-10-06T11:50:00Z", entitlement: null,
      now: new Date("2026-10-06T12:00:00Z").getTime(),
    }).reviewState).toBe("pending");
    expect(deriveAdminCommerceReviewState({
      status: "capture_pending", failureCode: null, createdAt: "2026-10-06T10:00:00Z", entitlement: null,
      now: new Date("2026-10-06T12:00:00Z").getTime(),
    })).toMatchObject({ reviewState: "needs_review", reviewReasons: ["stale_capture_pending"] });
  });

  it("bounds pagination and preserves supported filters/search", () => {
    expect(normalizeAdminCommerceListFilters({
      page: "2", pageSize: "999", status: "paid", access: "active", priceSource: "preorder",
      reviewState: "ok", search: "PAYPAL-123",
    })).toEqual({
      page: 2, pageSize: ADMIN_COMMERCE_MAX_PAGE_SIZE, status: "paid", access: "active",
      priceSource: "preorder", reviewState: "ok", search: "PAYPAL-123",
    });
  });

  it("applies identifier/email filters and bounded page slicing", () => {
    const first = mapAdminCommerceOrder(rawOrder(), "buyer@example.com");
    expect(first).not.toBeNull();
    if (!first) return;
    const filters = normalizeAdminCommerceListFilters({ status: "paid", access: "active", search: "paypal-capture" });
    expect(matchesAdminCommerceFilters(first, filters)).toBe(true);
    expect(matchesAdminCommerceFilters(first, { ...filters, priceSource: "preorder" })).toBe(false);
    const rows = Array.from({ length: 60 }, (_, index) => ({ ...first, id: `order-${index}` }));
    expect(paginateAdminCommerceOrders(rows, 2, 25).map((row) => row.id)).toEqual(
      Array.from({ length: 25 }, (_, index) => `order-${index + 25}`),
    );
  });

  it("resolves email only through a bounded server-side Auth Admin directory", () => {
    const source = readFileSync(`${process.cwd()}/lib/server/admin/commerce.ts`, "utf8");
    expect(source).toContain("serviceRole: true");
    expect(source).toContain("supabase.auth.admin.listUsers");
    expect(source).toContain("AUTH_DIRECTORY_MAX_PAGES = 5");
    expect(source).not.toContain("user_metadata");
  });

  it("derives personalization locale without exposing names", () => {
    const payload = { locale: "he", leadName: "Private", participants: ["Private 2"] };
    expect(personalizationLocale(payload)).toBe("he");
    const publicSummary = { exists: true, locale: personalizationLocale(payload), updatedAt: "2026-10-06" };
    expect(JSON.stringify(publicSummary)).not.toContain("Private");
  });

  it("sanitizes provider events without raw payload, hashes or transmission metadata", () => {
    const rawEvent = {
      id: "event-1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      status: "processed",
      provider_order_id: "PAYPAL-ORDER",
      provider_capture_id: "PAYPAL-CAPTURE",
      failure_code: null,
      received_at: "2026-10-06T12:00:00Z",
      processed_at: "2026-10-06T12:00:01Z",
      payload_hash: "must-not-appear",
      transmission_id: "must-not-appear",
      raw_payload: { payer: { email: "must-not-appear@example.com" } },
    } as const;
    const summary = sanitizeProviderEvents([rawEvent]);
    expect(summary).toHaveLength(1);
    expect(JSON.stringify(summary)).not.toContain("must-not-appear");
    expect(summary[0]).toMatchObject({ eventType: "PAYMENT.CAPTURE.COMPLETED", status: "processed" });
  });
});
