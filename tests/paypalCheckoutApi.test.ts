import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const mocks = vi.hoisted(() => ({
  resolveCustomerAccess: vi.fn(),
  createLocalCommerceOrder: vi.fn(),
  resolveProductPrice: vi.fn(),
  findResumable: vi.fn(),
  getOrder: vi.fn(),
  bindOrder: vi.fn(),
  beginCapture: vi.fn(),
  paypalCreate: vi.fn(),
  paypalCapture: vi.fn(),
  paypalShow: vi.fn(),
  finalize: vi.fn(),
  PayPalApiError: class PayPalApiError extends Error {},
}));

vi.mock("@/lib/server/auth/customerAccess", () => ({ resolveCustomerAccess: mocks.resolveCustomerAccess }));
vi.mock("@/lib/server/commerce/orders", () => ({ createLocalCommerceOrder: mocks.createLocalCommerceOrder }));
vi.mock("@/lib/server/commerce/paypal/orders", () => ({
  getPayPalCheckoutOrderForCustomer: mocks.getOrder,
  findResumablePayPalCheckoutForCustomer: mocks.findResumable,
  bindPayPalOrderToLocalOrder: mocks.bindOrder,
  beginPayPalOrderCapture: mocks.beginCapture,
}));
vi.mock("@/lib/server/commerce/resolveProductPrice", () => ({ resolveProductPrice: mocks.resolveProductPrice }));
vi.mock("@/lib/server/commerce/paypal/config", () => ({
  getPayPalServerConfig: () => ({
    environment: "sandbox", clientId: "client", clientSecret: "test-value",
    apiBaseUrl: "https://api-m.sandbox.paypal.com", sdkUrl: "https://www.sandbox.paypal.com/web-sdk/v6/core",
  }),
}));
vi.mock("@/lib/server/commerce/paypal/client", () => ({
  PayPalApiError: mocks.PayPalApiError,
  createPayPalClient: () => ({
    createOrder: mocks.paypalCreate,
    captureOrder: mocks.paypalCapture,
    showOrder: mocks.paypalShow,
  }),
}));
vi.mock("@/lib/server/commerce/finalizePaidOrder", () => ({ finalizeLocalOrderPaid: mocks.finalize }));

import { paypalCreateHandler } from "@/pages/api/customer/checkout/paypal/create";
import { paypalCaptureHandler } from "@/pages/api/customer/checkout/paypal/capture";
import { paypalResumeHandler } from "@/pages/api/customer/checkout/paypal/resume";

const user = { id: "11111111-1111-4111-8111-111111111111", email: "buyer@example.com", email_confirmed_at: "2026-10-01" };
const localOrderId = "22222222-2222-4222-8222-222222222222";
const checkoutKey = "33333333-3333-4333-8333-333333333333";

function request(body: unknown, origin = "http://localhost:3000") {
  return {
    method: "POST", body, query: {}, cookies: {}, headers: { origin },
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;
}

function response() {
  const result = { status: 200, body: null as unknown, headers: {} as Record<string, string> };
  const res = {
    headersSent: false, statusCode: 200,
    setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }),
    status: vi.fn((status: number) => { result.status = status; res.statusCode = status; return res; }),
    json: vi.fn((body: unknown) => { result.body = body; return res; }),
  } as unknown as NextApiResponse;
  return { res, result };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    orderId: localOrderId, userId: user.id, status: "creating", providerOrderId: null,
    providerCaptureId: null, totalMinor: 4900, currency: "ILS",
    paypalCreateRequestId: "create-request", paypalCaptureRequestId: "capture-request",
    productId: "sound-case-001", priceSource: "catalog", entitlementId: null, ...overrides,
  };
}

describe("authenticated PayPal create endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCustomerAccess.mockResolvedValue({ isAuthenticated: true, accessToken: "token", user });
    mocks.createLocalCommerceOrder.mockResolvedValue({ status: "order", order: { orderId: localOrderId } });
    mocks.getOrder.mockResolvedValue(order());
    mocks.paypalCreate.mockResolvedValue({ id: "PAYPAL_ORDER_1", status: "CREATED" });
    mocks.bindOrder.mockResolvedValue({ result: "bound", orderId: localOrderId, status: "pending_approval", paypalOrderId: "PAYPAL_ORDER_1" });
  });

  it.each([[3900, "preorder"], [4900, "catalog"]] as const)(
    "returns the immutable %i ILS %s snapshot", async (amountMinor, _source) => {
      mocks.getOrder.mockResolvedValue(order({ totalMinor: amountMinor }));
      const { res, result } = response();
      await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), res);
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ ok: true, amountMinor, currency: "ILS", paypalOrderId: "PAYPAL_ORDER_1" });
      expect(mocks.paypalCreate).toHaveBeenCalledWith(expect.objectContaining({ amountMinor, currency: "ILS" }));
    },
  );

  it("rejects authentication, foreign origins and browser-controlled prices", async () => {
    mocks.resolveCustomerAccess.mockResolvedValueOnce({ isAuthenticated: false, accessToken: null, user: null });
    const anonymous = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), anonymous.res);
    expect(anonymous.result.status).toBe(401);

    const foreign = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }, "https://evil.example"), foreign.res);
    expect(foreign.result.status).toBe(403);

    const tampered = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey, price: 1, currency: "USD" }), tampered.res);
    expect(tampered.result.status).toBe(400);
    expect(mocks.createLocalCommerceOrder).not.toHaveBeenCalled();
  });

  it("does not create another PayPal order on an idempotent retry", async () => {
    mocks.getOrder.mockResolvedValue(order({ status: "pending_approval", providerOrderId: "PAYPAL_ORDER_1" }));
    const { res, result } = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), res);
    expect(result.body).toMatchObject({ ok: true, paypalOrderId: "PAYPAL_ORDER_1" });
    expect(mocks.paypalCreate).not.toHaveBeenCalled();
    expect(mocks.bindOrder).not.toHaveBeenCalled();
  });

  it("does not create an order when the product is already owned", async () => {
    mocks.createLocalCommerceOrder.mockResolvedValue({ status: "already_owned", productId: "sound-case-001" });
    const { res, result } = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), res);
    expect(result.body).toEqual({ ok: true, status: "already_owned", productId: "sound-case-001" });
    expect(mocks.paypalCreate).not.toHaveBeenCalled();
  });

  it("blocks a third order when multiple resumable orders need reconciliation", async () => {
    mocks.createLocalCommerceOrder.mockResolvedValue({
      status: "needs_reconciliation", productId: "sound-case-001",
    });
    const { res, result } = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), res);
    expect(result.body).toEqual({ ok: true, status: "needs_reconciliation", productId: "sound-case-001" });
    expect(mocks.paypalCreate).not.toHaveBeenCalled();
  });

  it("returns capture_pending as reconciliation work instead of opening PayPal again", async () => {
    mocks.getOrder.mockResolvedValue(order({
      status: "capture_pending", providerOrderId: "PAYPAL_ORDER_1", totalMinor: 3900,
    }));
    const { res, result } = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), res);
    expect(result.body).toMatchObject({
      ok: true, status: "reconcile_required", localOrderId, paypalOrderId: "PAYPAL_ORDER_1", amountMinor: 3900,
    });
    expect(mocks.paypalCreate).not.toHaveBeenCalled();
  });

  it("returns a safe failure and never grants access when PayPal create fails", async () => {
    mocks.paypalCreate.mockRejectedValue(new mocks.PayPalApiError("provider unavailable"));
    const { res, result } = response();
    await paypalCreateHandler(request({ productId: "sound-case-001", checkoutIdempotencyKey: checkoutKey }), res);
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ ok: false, code: "paypal_unavailable" });
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
});

describe("authenticated PayPal capture endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCustomerAccess.mockResolvedValue({ isAuthenticated: true, accessToken: "token", user });
    mocks.getOrder.mockResolvedValue(order({ status: "pending_approval", providerOrderId: "PAYPAL_ORDER_1" }));
    mocks.beginCapture.mockResolvedValue({ result: "capture_ready", orderId: localOrderId, status: "capture_pending" });
    mocks.paypalCapture.mockResolvedValue({
      status: "completed", paypalOrderId: "PAYPAL_ORDER_1", captureId: "CAPTURE_1", amountMinor: 4900, currency: "ILS",
    });
    mocks.paypalShow.mockResolvedValue({
      status: "completed", paypalOrderId: "PAYPAL_ORDER_1", captureId: "CAPTURE_1", amountMinor: 4900, currency: "ILS",
    });
    mocks.finalize.mockResolvedValue({ result: "paid", orderId: localOrderId, entitlementId: "entitlement-1" });
  });

  it("finalizes only a completed, server-verified capture", async () => {
    const { res, result } = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), res);
    expect(result.body).toEqual({ ok: true, status: "paid", localOrderId, entitlementId: "entitlement-1" });
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      orderId: localOrderId, providerOrderId: "PAYPAL_ORDER_1", providerCaptureId: "CAPTURE_1",
      confirmedAmountMinor: 4900, confirmedCurrency: "ILS",
    }));
  });

  it("requires authenticated same-origin requests", async () => {
    mocks.resolveCustomerAccess.mockResolvedValueOnce({ isAuthenticated: false, accessToken: null, user: null });
    const anonymous = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), anonymous.res);
    expect(anonymous.result.status).toBe(401);

    const foreignOrigin = response();
    await paypalCaptureHandler(
      request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }, "https://evil.example"),
      foreignOrigin.res,
    );
    expect(foreignOrigin.result.status).toBe(403);
    expect(mocks.paypalCapture).not.toHaveBeenCalled();
  });

  it("rejects a foreign customer's order and provider-order mismatch", async () => {
    mocks.getOrder.mockResolvedValueOnce(null);
    const foreign = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), foreign.res);
    expect(foreign.result.status).toBe(404);
    expect(mocks.paypalCapture).not.toHaveBeenCalled();

    mocks.getOrder.mockResolvedValueOnce(order({ status: "pending_approval", providerOrderId: "PAYPAL_ORDER_1" }));
    const mismatch = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "OTHER_ORDER" }), mismatch.res);
    expect(mismatch.result.status).toBe(409);
    expect(mocks.paypalCapture).not.toHaveBeenCalled();
  });

  it("rejects browser capture facts and non-Sound-Case local orders", async () => {
    const injected = response();
    await paypalCaptureHandler(request({
      localOrderId, paypalOrderId: "PAYPAL_ORDER_1", captureId: "FAKE", amountMinor: 1, currency: "USD",
    }), injected.res);
    expect(injected.result.status).toBe(400);
    expect(mocks.paypalCapture).not.toHaveBeenCalled();

    mocks.getOrder.mockResolvedValueOnce(order({ productId: "other-product", status: "pending_approval", providerOrderId: "PAYPAL_ORDER_1" }));
    const wrongProduct = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), wrongProduct.res);
    expect(wrongProduct.result.status).toBe(409);
    expect(mocks.paypalCapture).not.toHaveBeenCalled();
  });

  it("does not finalize non-completed captures", async () => {
    mocks.paypalCapture.mockResolvedValue({ status: "not_completed", paypalOrderId: "PAYPAL_ORDER_1", paypalStatus: "PENDING" });
    const { res, result } = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), res);
    expect(result.status).toBe(409);
    expect(result.body).toEqual({ ok: false, code: "payment_not_completed" });
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("reconciles capture_pending through Show Order without a second Capture", async () => {
    mocks.getOrder.mockResolvedValue(order({
      status: "capture_pending", providerOrderId: "PAYPAL_ORDER_1", totalMinor: 3900,
    }));
    mocks.paypalShow.mockResolvedValue({
      status: "completed", paypalOrderId: "PAYPAL_ORDER_1", captureId: "CAPTURE_REAL", amountMinor: 3900, currency: "ILS",
    });
    const { res, result } = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), res);
    expect(result.body).toMatchObject({ ok: true, status: "paid" });
    expect(mocks.paypalShow).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 3900, currency: "ILS" }));
    expect(mocks.paypalCapture).not.toHaveBeenCalled();
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ providerCaptureId: "CAPTURE_REAL" }));
  });

  it("captures only after capture_pending Show Order proves the order is APPROVED", async () => {
    mocks.getOrder.mockResolvedValue(order({ status: "capture_pending", providerOrderId: "PAYPAL_ORDER_1" }));
    mocks.paypalShow.mockResolvedValue({
      status: "not_completed", paypalOrderId: "PAYPAL_ORDER_1", paypalStatus: "APPROVED",
    });
    const { res, result } = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), res);
    expect(result.body).toMatchObject({ ok: true, status: "paid" });
    expect(mocks.paypalShow).toHaveBeenCalledTimes(1);
    expect(mocks.paypalCapture).toHaveBeenCalledTimes(1);
  });

  it.each(["amount_mismatch", "currency_mismatch"])(
    "does not grant when finalizer returns %s", async (finalizerResult) => {
      mocks.finalize.mockResolvedValue({ result: finalizerResult, orderId: localOrderId, entitlementId: null });
      const { res, result } = response();
      await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), res);
      expect(result.status).toBe(409);
      expect(result.body).toEqual({ ok: false, code: "payment_verification_failed" });
    },
  );

  it("returns an already-paid order without capture or entitlement re-grant", async () => {
    mocks.getOrder.mockResolvedValue(order({
      status: "paid", providerOrderId: "PAYPAL_ORDER_1", providerCaptureId: "CAPTURE_1", entitlementId: "revoked-entitlement",
    }));
    const { res, result } = response();
    await paypalCaptureHandler(request({ localOrderId, paypalOrderId: "PAYPAL_ORDER_1" }), res);
    expect(result.body).toEqual({ ok: true, status: "paid", localOrderId, entitlementId: "revoked-entitlement" });
    expect(mocks.paypalCapture).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
});

describe("authenticated PayPal resume endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCustomerAccess.mockResolvedValue({ isAuthenticated: true, accessToken: "token", user });
    mocks.resolveProductPrice.mockResolvedValue({
      status: "priced", productId: "sound-case-001", priceMinor: 4900, currency: "ILS", source: "catalog",
    });
    mocks.findResumable.mockResolvedValue({ status: "none" });
  });

  it("returns one resumable historical snapshot without recalculating its price", async () => {
    mocks.findResumable.mockResolvedValue({
      status: "one",
      order: order({
        status: "capture_pending", providerOrderId: "PAYPAL_ORDER_1",
        totalMinor: 3900, priceSource: "preorder",
      }),
    });
    const { res, result } = response();
    await paypalResumeHandler(request({ productId: "sound-case-001" }), res);
    expect(result.body).toMatchObject({
      ok: true, status: "resumable", lifecycle: "capture_pending", amountMinor: 3900,
      priceSource: "preorder",
    });
  });

  it("reports ambiguity without choosing an order", async () => {
    mocks.findResumable.mockResolvedValue({ status: "needs_reconciliation" });
    const { res, result } = response();
    await paypalResumeHandler(request({ productId: "sound-case-001" }), res);
    expect(result.body).toEqual({ ok: true, status: "needs_reconciliation", productId: "sound-case-001" });
  });
});
