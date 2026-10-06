import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const mocks = vi.hoisted(() => ({
  verifySignature: vi.fn(),
  showOrder: vi.fn(),
  claimEvent: vi.fn(),
  setEventStatus: vi.fn(),
  getOrder: vi.fn(),
  finalize: vi.fn(),
  issueReceipt: vi.fn(),
  captureAndAlert: vi.fn(),
  discordAlert: vi.fn(),
  PayPalApiError: class PayPalApiError extends Error {
    httpStatus: number;
    safeCode: string;
    debugId: string | null;

    constructor(input: { httpStatus: number; safeCode: string; debugId?: string | null }) {
      super(input.safeCode);
      this.httpStatus = input.httpStatus;
      this.safeCode = input.safeCode;
      this.debugId = input.debugId ?? null;
    }
  },
}));

vi.mock("@/lib/server/commerce/paypal/config", () => ({
  getPayPalWebhookConfig: () => ({
    environment: "sandbox",
    clientId: "client-id",
    clientSecret: "server-secret-test-value",
    webhookId: "WEBHOOK123",
    apiBaseUrl: "https://api-m.sandbox.paypal.com",
    sdkUrl: "https://www.sandbox.paypal.com/web-sdk/v6/core",
  }),
}));
vi.mock("@/lib/server/commerce/paypal/client", () => ({
  PayPalApiError: mocks.PayPalApiError,
  createPayPalClient: () => ({
    verifyWebhookSignature: mocks.verifySignature,
    showOrder: mocks.showOrder,
  }),
}));
vi.mock("@/lib/server/commerce/providerEvents", () => ({
  ProviderEventIdentityConflictError: class ProviderEventIdentityConflictError extends Error {},
  claimPaymentProviderEvent: mocks.claimEvent,
  setPaymentProviderEventStatus: mocks.setEventStatus,
}));
vi.mock("@/lib/server/commerce/paypal/orders", () => ({
  getPayPalCheckoutOrderByProviderOrderId: mocks.getOrder,
}));
vi.mock("@/lib/server/commerce/finalizePaidOrder", () => ({
  finalizeLocalOrderPaid: mocks.finalize,
}));
vi.mock("@/lib/server/commerce/receipts/issuance", () => ({
  issueReceiptAfterPaidFinalization: mocks.issueReceipt,
}));
vi.mock("@/lib/monitoring/captureAndAlertServerError", () => ({
  captureAndAlertServerError: mocks.captureAndAlert,
}));
vi.mock("@/lib/monitoring/discordAlert", () => ({
  sendDiscordErrorAlert: mocks.discordAlert,
}));

import { paypalWebhookHandler } from "@/pages/api/webhooks/paypal";

const localOrder = {
  orderId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  status: "capture_pending",
  providerOrderId: "PAYPAL_ORDER_1",
  providerCaptureId: null,
  totalMinor: 3900,
  currency: "ILS",
  paypalCreateRequestId: "create-request",
  paypalCaptureRequestId: "capture-request",
  productId: "sound-case-001",
  priceSource: "preorder",
  entitlementId: null,
};

function completedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "WH_EVENT_1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAPTURE_1",
      status: "COMPLETED",
      supplementary_data: { related_ids: { order_id: "PAYPAL_ORDER_1" } },
    },
    ...overrides,
  };
}

function request(payload: unknown, headers: Record<string, string> = {}) {
  return {
    method: "POST",
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
    query: {},
    cookies: {},
    headers: {
      "paypal-transmission-id": "transmission-1",
      "paypal-transmission-time": "2026-10-06T10:00:00Z",
      "paypal-transmission-sig": "signature-value",
      "paypal-cert-url": "https://api-m.sandbox.paypal.com/cert.pem",
      "paypal-auth-algo": "SHA256withRSA",
      ...headers,
    },
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;
}

function response() {
  const result = { status: 200, body: null as unknown, headers: {} as Record<string, string> };
  const res = {
    headersSent: false,
    statusCode: 200,
    setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }),
    status: vi.fn((status: number) => { result.status = status; res.statusCode = status; return res; }),
    json: vi.fn((body: unknown) => { result.body = body; return res; }),
  } as unknown as NextApiResponse;
  return { res, result };
}

describe("PayPal webhook reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifySignature.mockResolvedValue(true);
    mocks.claimEvent.mockResolvedValue({
      eventId: "33333333-3333-4333-8333-333333333333",
      claimStatus: "claimed",
      claimed: true,
      duplicate: false,
      status: "processing",
      payloadHash: "a".repeat(64),
    });
    mocks.setEventStatus.mockResolvedValue({ result: "updated", status: "failed" });
    mocks.getOrder.mockResolvedValue(localOrder);
    mocks.showOrder.mockResolvedValue({
      status: "completed",
      paypalOrderId: "PAYPAL_ORDER_1",
      captureId: "CAPTURE_1",
      amountMinor: 3900,
      currency: "ILS",
    });
    mocks.finalize.mockResolvedValue({
      result: "paid",
      orderId: localOrder.orderId,
      entitlementId: "44444444-4444-4444-8444-444444444444",
    });
    mocks.issueReceipt.mockResolvedValue({ status: "issued", receiptId: "receipt-1", displayNumber: "WEB-000001" });
    mocks.captureAndAlert.mockResolvedValue(undefined);
    mocks.discordAlert.mockResolvedValue({ ok: true, status: "sent" });
  });

  it("rejects missing headers and failed signatures before claiming an event", async () => {
    const missing = response();
    const missingRequest = request(completedEvent());
    delete missingRequest.headers["paypal-transmission-sig"];
    await paypalWebhookHandler(missingRequest, missing.res);
    expect(missing.result).toMatchObject({ status: 400, body: { code: "missing_signature_headers" } });
    expect(mocks.claimEvent).not.toHaveBeenCalled();

    mocks.verifySignature.mockResolvedValueOnce(false);
    const invalid = response();
    await paypalWebhookHandler(request(completedEvent()), invalid.res);
    expect(invalid.result).toMatchObject({ status: 401, body: { code: "invalid_signature" } });
    expect(mocks.claimEvent).not.toHaveBeenCalled();
  });

  it("returns a retryable response when PayPal signature verification is unavailable", async () => {
    mocks.verifySignature.mockRejectedValueOnce(new mocks.PayPalApiError({
      httpStatus: 503,
      safeCode: "paypal_unavailable",
      debugId: "safe-debug-id",
    }));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result).toMatchObject({
      status: 503,
      body: { code: "signature_verification_unavailable" },
    });
    expect(mocks.claimEvent).not.toHaveBeenCalled();
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("server-secret-test-value");
    consoleSpy.mockRestore();
  });

  it("rejects malformed events without persisting payload data", async () => {
    const malformedJson = response();
    await paypalWebhookHandler(request("{"), malformedJson.res);
    expect(malformedJson.result.status).toBe(400);

    const malformedEvent = response();
    await paypalWebhookHandler(request({ event_type: "PAYMENT.CAPTURE.COMPLETED" }), malformedEvent.res);
    expect(malformedEvent.result.status).toBe(400);
    expect(mocks.claimEvent).not.toHaveBeenCalled();
  });

  it("reconciles a verified capture using Show Order and the atomic finalizer", async () => {
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result).toMatchObject({ status: 200, body: { ok: true, status: "processed" } });
    expect(mocks.verifySignature).toHaveBeenCalledWith(expect.objectContaining({
      webhookId: "WEBHOOK123",
      webhookEvent: expect.objectContaining({ id: "WH_EVENT_1" }),
    }));
    expect(mocks.claimEvent).toHaveBeenCalledWith(expect.objectContaining({
      providerEventId: "WH_EVENT_1",
      providerOrderId: "PAYPAL_ORDER_1",
      providerCaptureId: "CAPTURE_1",
    }));
    expect(mocks.showOrder).toHaveBeenCalledWith({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: localOrder.orderId,
      amountMinor: 3900,
      currency: "ILS",
    });
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({
      orderId: localOrder.orderId,
      providerCaptureId: "CAPTURE_1",
      providerEventRecordId: "33333333-3333-4333-8333-333333333333",
    }));
    expect(mocks.issueReceipt).toHaveBeenCalledWith({ orderId: localOrder.orderId, source: "webhook" });
  });

  it("keeps the provider event processed when receipt issuance fails", async () => {
    mocks.issueReceipt.mockResolvedValue({ status: "failed", code: "rpc_unavailable" });
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result).toMatchObject({ status: 200, body: { ok: true, status: "processed" } });
    expect(mocks.finalize).toHaveBeenCalledTimes(1);
  });

  it("finalizes a pending-approval order from authoritative completed evidence without Capture", async () => {
    mocks.getOrder.mockResolvedValueOnce({ ...localOrder, status: "pending_approval" });
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result.status).toBe(200);
    expect(mocks.showOrder).toHaveBeenCalledTimes(1);
    expect(mocks.finalize).toHaveBeenCalledTimes(1);
  });

  it("treats processed duplicates as success without a second grant", async () => {
    mocks.claimEvent.mockResolvedValue({
      eventId: "event-record",
      claimStatus: "duplicate",
      claimed: false,
      duplicate: true,
      status: "processed",
      payloadHash: "a".repeat(64),
    });
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result).toMatchObject({ status: 200, body: { status: "already_processed" } });
    expect(mocks.showOrder).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.issueReceipt).toHaveBeenCalledWith({ orderId: localOrder.orderId, source: "webhook" });
  });

  it("keeps a processed duplicate successful when receipt recovery and alerting both fail", async () => {
    mocks.claimEvent.mockResolvedValue({
      eventId: "event-record",
      claimStatus: "duplicate",
      claimed: false,
      duplicate: true,
      status: "processed",
      payloadHash: "a".repeat(64),
    });
    mocks.getOrder.mockRejectedValueOnce(new Error("receipt lookup unavailable"));
    mocks.captureAndAlert.mockRejectedValueOnce(new Error("alert unavailable"));

    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);

    expect(result).toMatchObject({ status: 200, body: { status: "already_processed" } });
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.captureAndAlert).toHaveBeenCalledTimes(1);
  });

  it("asks PayPal to retry while a concurrent delivery is processing", async () => {
    mocks.claimEvent.mockResolvedValue({
      eventId: "event-record",
      claimStatus: "duplicate",
      claimed: false,
      duplicate: true,
      status: "processing",
      payloadHash: "a".repeat(64),
    });
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result).toMatchObject({ status: 503, body: { code: "event_processing" } });
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("makes browser-first and webhook-first races converge without re-granting", async () => {
    mocks.finalize.mockResolvedValueOnce({
      result: "already_paid",
      orderId: localOrder.orderId,
      entitlementId: "revoked-entitlement",
    });
    const browserFirst = response();
    await paypalWebhookHandler(request(completedEvent()), browserFirst.res);
    expect(browserFirst.result.body).toEqual({ ok: true, status: "already_processed" });
    expect(mocks.finalize).toHaveBeenCalledTimes(1);

    mocks.finalize.mockClear();
    mocks.claimEvent.mockResolvedValueOnce({
      eventId: "event-record",
      claimStatus: "duplicate",
      claimed: false,
      duplicate: true,
      status: "processed",
      payloadHash: "a".repeat(64),
    });
    const webhookReplay = response();
    await paypalWebhookHandler(request(completedEvent()), webhookReplay.res);
    expect(webhookReplay.result.status).toBe(200);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong amount", { safeCode: "amount_mismatch" }],
    ["wrong currency", { safeCode: "currency_mismatch" }],
    ["provider order mismatch", { safeCode: "order_relationship_mismatch" }],
  ])("fails closed on %s from authoritative Show Order", async (_label, paypalError) => {
    const error = new mocks.PayPalApiError({ httpStatus: 502, safeCode: paypalError.safeCode });
    mocks.showOrder.mockRejectedValueOnce(error);
    const { res, result } = response();
    await paypalWebhookHandler(request(completedEvent()), res);
    expect(result.status).toBe(422);
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.setEventStatus).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });

  it("rejects capture mismatches and non-completed authoritative payments", async () => {
    mocks.showOrder.mockResolvedValueOnce({
      status: "completed", paypalOrderId: "PAYPAL_ORDER_1", captureId: "OTHER_CAPTURE",
      amountMinor: 3900, currency: "ILS",
    });
    const mismatch = response();
    await paypalWebhookHandler(request(completedEvent()), mismatch.res);
    expect(mismatch.result.status).toBe(422);
    expect(mocks.finalize).not.toHaveBeenCalled();

    mocks.showOrder.mockResolvedValueOnce({
      status: "not_completed", paypalOrderId: "PAYPAL_ORDER_1", paypalStatus: "APPROVED",
    });
    const pending = response();
    await paypalWebhookHandler(request(completedEvent({ id: "WH_EVENT_2" })), pending.res);
    expect(pending.result.status).toBe(503);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("returns a retryable response on local lookup or finalizer failure", async () => {
    mocks.getOrder.mockResolvedValueOnce(null);
    const unknown = response();
    await paypalWebhookHandler(request(completedEvent()), unknown.res);
    expect(unknown.result).toMatchObject({ status: 503, body: { code: "order_not_found" } });

    mocks.finalize.mockRejectedValueOnce(new Error("temporary database failure"));
    const databaseFailure = response();
    await paypalWebhookHandler(request(completedEvent({ id: "WH_EVENT_2" })), databaseFailure.res);
    expect(databaseFailure.result.status).toBe(503);
    expect(mocks.captureAndAlert).toHaveBeenCalled();
  });

  it("stores review and unknown event metadata as ignored without changing access", async () => {
    for (const eventType of ["PAYMENT.CAPTURE.REFUNDED", "CUSTOM.UNKNOWN.EVENT"]) {
      mocks.claimEvent.mockResolvedValueOnce({
        eventId: `event-${eventType}`,
        claimStatus: "claimed",
        claimed: true,
        duplicate: false,
        status: "processing",
        payloadHash: "a".repeat(64),
      });
      const { res, result } = response();
      await paypalWebhookHandler(request(completedEvent({
        id: `WH_${eventType.replaceAll(".", "_")}`,
        event_type: eventType,
      })), res);
      expect(result).toMatchObject({ status: 200, body: { status: "ignored" } });
    }
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.setEventStatus).toHaveBeenCalledTimes(2);
    expect(mocks.discordAlert).toHaveBeenCalledTimes(1);
  });

  it("never passes the raw payload or payer PII to logs or persistence metadata", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const event = completedEvent({
      resource: {
        id: "CAPTURE_1",
        status: "COMPLETED",
        payer: { email_address: "private-buyer@example.com", name: "Private Buyer" },
        supplementary_data: { related_ids: { order_id: "PAYPAL_ORDER_1" } },
      },
    });
    const { res } = response();
    await paypalWebhookHandler(request(event), res);
    expect(mocks.claimEvent).toHaveBeenCalledWith(expect.objectContaining({
      providerEventId: "WH_EVENT_1",
      providerOrderId: "PAYPAL_ORDER_1",
      providerCaptureId: "CAPTURE_1",
    }));
    expect(JSON.stringify(mocks.claimEvent.mock.calls[0]?.[0])).not.toContain("server-secret-test-value");
    expect(JSON.stringify(mocks.finalize.mock.calls)).not.toContain("private-buyer@example.com");
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("private-buyer@example.com");
    consoleSpy.mockRestore();
  });
});
