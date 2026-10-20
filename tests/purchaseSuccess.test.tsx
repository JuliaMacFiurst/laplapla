import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrder: vi.fn(),
  resolveAccess: vi.fn(),
  refundResult: { data: null as unknown, error: null as unknown },
  entitlementResult: { data: { id: "entitlement-1" } as unknown, error: null as unknown },
  calls: [] as Array<[string, string, unknown]>,
}));

vi.mock("@/hooks/useCustomerSession", () => ({ useCustomerSession: () => ({ status: "anonymous", session: null, error: null }) }));
vi.mock("@/lib/server/auth/customerAccess", () => ({ resolveCustomerAccess: mocks.resolveAccess }));
vi.mock("@/lib/server/commerce/paypal/orders", () => ({ getPayPalCheckoutOrderForCustomer: mocks.getOrder }));
vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "limit"]) {
        chain[method] = (...args: unknown[]) => { mocks.calls.push([table, method, args]); return chain; };
      }
      chain.maybeSingle = async () => table === "commerce_refund_operations" ? mocks.refundResult : mocks.entitlementResult;
      return chain;
    },
  }),
}));

import statusHandler from "@/pages/api/customer/checkout/paypal/status";
import { PurchaseSuccessView } from "@/pages/shop/[slug]/success";
import { purchaseSuccessCopy } from "@/lib/shop/purchaseSuccessCopy";

const orderId = "22222222-2222-4222-8222-222222222222";
const userId = "11111111-1111-4111-8111-111111111111";
const order = {
  orderId, userId, productId: "sound-case-001", status: "paid",
  providerCaptureId: "CAPTURE_1", entitlementId: "entitlement-1",
};

function request(id: string = orderId) {
  return { method: "GET", query: { orderId: id }, headers: { authorization: "Bearer test-token" } } as unknown as NextApiRequest;
}

function response() {
  const result = { status: 200, body: null as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }),
    status: vi.fn((status: number) => { result.status = status; return res; }),
    json: vi.fn((body: unknown) => { result.body = body; return res; }),
  } as unknown as NextApiResponse;
  return { res, result };
}

describe("purchase success verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls = [];
    mocks.refundResult = { data: null, error: null };
    mocks.entitlementResult = { data: { id: "entitlement-1" }, error: null };
    mocks.resolveAccess.mockResolvedValue({ isAuthenticated: true, user: { id: userId }, accessToken: "test-token" });
    mocks.getOrder.mockResolvedValue(order);
  });

  it("shows success only for the authenticated owner's paid, captured, non-refunded order with active access", async () => {
    const target = response();
    await statusHandler(request(), target.res);
    expect(target.result).toMatchObject({ status: 200, body: { ok: true, status: "ready" } });
    expect(target.result.headers["Cache-Control"]).toContain("no-store");
    expect(mocks.getOrder).toHaveBeenCalledWith(orderId, userId);
    expect(mocks.calls).toContainEqual(["product_entitlements", "eq", ["id", "entitlement-1"]]);
    expect(mocks.calls).toContainEqual(["product_entitlements", "eq", ["user_id", userId]]);
  });

  it("rejects unauthenticated, foreign, invalid and refunded orders without a congratulation", async () => {
    mocks.resolveAccess.mockResolvedValueOnce({ isAuthenticated: false });
    const anonymous = response();
    await statusHandler(request(), anonymous.res);
    expect(anonymous.result.status).toBe(401);
    expect(mocks.getOrder).not.toHaveBeenCalled();

    mocks.getOrder.mockResolvedValueOnce(null);
    const foreign = response();
    await statusHandler(request(), foreign.res);
    expect(foreign.result.status).toBe(404);

    const invalid = response();
    await statusHandler(request("not-an-order"), invalid.res);
    expect(invalid.result.status).toBe(400);

    mocks.refundResult.data = { id: "refund-1" };
    const refunded = response();
    await statusHandler(request(), refunded.res);
    expect(refunded.result.body).toEqual({ ok: true, status: "unconfirmed" });
  });

  it("keeps pending payments unconfirmed and paid orders without active entitlement in processing", async () => {
    mocks.getOrder.mockResolvedValueOnce({ ...order, status: "capture_pending", providerCaptureId: null });
    const pending = response();
    await statusHandler(request(), pending.res);
    expect(pending.result.body).toEqual({ ok: true, status: "unconfirmed" });

    mocks.getOrder.mockResolvedValueOnce({ ...order, entitlementId: null });
    const noEntitlement = response();
    await statusHandler(request(), noEntitlement.res);
    expect(noEntitlement.result.body).toEqual({ ok: true, status: "processing" });

    mocks.entitlementResult.data = null;
    const inactive = response();
    await statusHandler(request(), inactive.res);
    expect(inactive.result.body).toEqual({ ok: true, status: "processing" });
  });
});

describe("localized purchase success page", () => {
  const base = { authStatus: "authenticated" as const, onCheckAgain: () => undefined };

  it.each(["ru", "en", "he"] as const)("shows the verified %s congratulations and personalization route", (lang) => {
    const html = renderToStaticMarkup(createElement(PurchaseSuccessView, { ...base, lang, state: "ready" }));
    expect(html).toContain(purchaseSuccessCopy[lang].title);
    expect(html).toContain(purchaseSuccessCopy[lang].body);
    expect(html).toContain(purchaseSuccessCopy[lang].personalize);
    expect(html).toContain(`${lang === "ru" ? "" : `/${lang}`}/shop/sound-case-001/create`);
    expect(html).toContain(purchaseSuccessCopy[lang].purchases);
    if (lang === "he") expect(html).toContain('dir="rtl"');
  });

  it("does not celebrate a direct URL, a signed-out buyer or an unconfirmed payment", () => {
    for (const state of ["loading", "processing", "unconfirmed"] as const) {
      const html = renderToStaticMarkup(createElement(PurchaseSuccessView, { ...base, lang: "en", state }));
      expect(html).not.toContain(purchaseSuccessCopy.en.title);
      expect(html).not.toContain(purchaseSuccessCopy.en.personalize);
    }
    const signedOut = renderToStaticMarkup(createElement(PurchaseSuccessView, { ...base, lang: "en", state: "ready", authStatus: "anonymous" }));
    expect(signedOut).toContain(purchaseSuccessCopy.en.signIn);
    expect(signedOut).not.toContain(purchaseSuccessCopy.en.title);
  });
});
