import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPayPalPublicConfig,
  getPayPalServerConfig,
  getPayPalWebhookConfig,
  resolvePayPalEnvironment,
} from "@/lib/server/commerce/paypal/config";
import { createPayPalClient, PayPalApiError } from "@/lib/server/commerce/paypal/client";

const originalEnvironment = process.env.PAYPAL_ENVIRONMENT;
const originalClientId = process.env.PAYPAL_CLIENT_ID;
const originalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
const originalWebhookId = process.env.PAYPAL_WEBHOOK_ID;

afterEach(() => {
  process.env.PAYPAL_ENVIRONMENT = originalEnvironment;
  process.env.PAYPAL_CLIENT_ID = originalClientId;
  process.env.PAYPAL_CLIENT_SECRET = originalClientSecret;
  process.env.PAYPAL_WEBHOOK_ID = originalWebhookId;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const testConfig = {
  environment: "sandbox" as const,
  clientId: "sandbox-client-id",
  clientSecret: "sandbox-test-value",
  apiBaseUrl: "https://api-m.sandbox.paypal.com",
  sdkUrl: "https://www.sandbox.paypal.com/web-sdk/v6/core",
};

function completedCapture(overrides: Record<string, unknown> = {}) {
  return {
    id: "PAYPAL_ORDER_1",
    status: "COMPLETED",
    purchase_units: [{
      reference_id: "11111111-1111-4111-8111-111111111111",
      payments: { captures: [{
        id: "CAPTURE_1",
        status: "COMPLETED",
        amount: { value: "49.00", currency_code: "ILS" },
      }] },
    }],
    ...overrides,
  };
}

describe("PayPal server configuration", () => {
  it("selects only official sandbox and live endpoints", () => {
    expect(resolvePayPalEnvironment("sandbox")).toBe("sandbox");
    expect(resolvePayPalEnvironment("live")).toBe("live");
    expect(() => resolvePayPalEnvironment("https://evil.example")).toThrow();

    process.env.PAYPAL_ENVIRONMENT = "sandbox";
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "server-only-test-value";
    expect(getPayPalServerConfig().apiBaseUrl).toBe("https://api-m.sandbox.paypal.com");
    process.env.PAYPAL_ENVIRONMENT = "live";
    expect(getPayPalServerConfig().apiBaseUrl).toBe("https://api-m.paypal.com");
  });

  it("fails safely when credentials are missing and never exposes the secret publicly", () => {
    process.env.PAYPAL_ENVIRONMENT = "sandbox";
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "server-only-test-value";
    const publicConfig = getPayPalPublicConfig();
    expect(publicConfig).toEqual({ clientId: "public-client-id", environment: "sandbox" });
    expect(JSON.stringify(publicConfig)).not.toContain("server-only-test-value");
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(() => getPayPalServerConfig()).toThrow("PayPal server credentials are not configured");
  });

  it("keeps the webhook ID server-only and validates it separately", () => {
    process.env.PAYPAL_ENVIRONMENT = "sandbox";
    process.env.PAYPAL_CLIENT_ID = "public-client-id";
    process.env.PAYPAL_CLIENT_SECRET = "server-only-test-value";
    process.env.PAYPAL_WEBHOOK_ID = "9AB12345CD678901E";
    expect(getPayPalWebhookConfig()).toMatchObject({
      environment: "sandbox",
      webhookId: "9AB12345CD678901E",
    });
    expect(JSON.stringify(getPayPalPublicConfig())).not.toContain("9AB12345CD678901E");
    delete process.env.PAYPAL_WEBHOOK_ID;
    expect(() => getPayPalWebhookConfig()).toThrow("PayPal webhook ID is not configured");
  });
});

describe("typed PayPal Orders v2 client", () => {
  it("verifies webhook signatures with PayPal and accepts only SUCCESS", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ verification_status: "SUCCESS" }));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    const webhookEvent = { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} };
    await expect(paypal.verifyWebhookSignature({
      webhookId: "WEBHOOK123",
      webhookEvent,
      transmission: {
        transmissionId: "transmission-1",
        transmissionTime: "2026-10-06T10:00:00Z",
        transmissionSignature: "signature-value",
        certificateUrl: "https://api-m.sandbox.paypal.com/cert.pem",
        authAlgorithm: "SHA256withRSA",
      },
    })).resolves.toBe(true);

    const verifyRequest = fetchImpl.mock.calls[1];
    expect(verifyRequest?.[0]).toBe(
      "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",
    );
    expect(JSON.parse(String(verifyRequest?.[1]?.body))).toEqual({
      auth_algo: "SHA256withRSA",
      cert_url: "https://api-m.sandbox.paypal.com/cert.pem",
      transmission_id: "transmission-1",
      transmission_sig: "signature-value",
      transmission_time: "2026-10-06T10:00:00Z",
      webhook_id: "WEBHOOK123",
      webhook_event: webhookEvent,
    });
  });

  it("rejects failed or malformed webhook verification responses", async () => {
    const failed = createPayPalClient({
      fetchImpl: vi.fn()
        .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
        .mockResolvedValueOnce(jsonResponse({ verification_status: "FAILURE" })),
      config: testConfig,
    });
    const input = {
      webhookId: "WEBHOOK123",
      webhookEvent: { id: "WH-1" },
      transmission: {
        transmissionId: "transmission-1",
        transmissionTime: "2026-10-06T10:00:00Z",
        transmissionSignature: "signature-value",
        certificateUrl: "https://api-m.sandbox.paypal.com/cert.pem",
        authAlgorithm: "SHA256withRSA",
      },
    };
    await expect(failed.verifyWebhookSignature(input)).resolves.toBe(false);

    const malformed = createPayPalClient({
      fetchImpl: vi.fn()
        .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
        .mockResolvedValueOnce(jsonResponse({ status: "SUCCESS" })),
      config: testConfig,
    });
    await expect(malformed.verifyWebhookSignature(input)).rejects.toMatchObject({
      safeCode: "malformed_webhook_verification_response",
    });
  });

  it("uses Basic OAuth and creates CAPTURE orders from the trusted local snapshot", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "access-token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ id: "PAYPAL_ORDER_1", status: "CREATED" }, 201));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.createOrder({
      localOrderId: "11111111-1111-4111-8111-111111111111",
      amountMinor: 3900,
      currency: "ILS",
      requestId: "create-request-id",
    })).resolves.toEqual({ id: "PAYPAL_ORDER_1", status: "CREATED" });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    const oauthHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(oauthHeaders.Authorization).toMatch(/^Basic /);
    expect(oauthHeaders.Authorization).not.toContain("sandbox-test-value");
    const createInit = fetchImpl.mock.calls[1]?.[1] as RequestInit;
    expect((createInit.headers as Record<string, string>)["PayPal-Request-Id"]).toBe("create-request-id");
    expect(JSON.parse(String(createInit.body))).toMatchObject({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: "11111111-1111-4111-8111-111111111111",
        custom_id: "11111111-1111-4111-8111-111111111111",
        amount: { value: "39.00", currency_code: "ILS" },
      }],
    });
  });

  it("accepts only a completed capture tied to the expected local and provider order", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse(completedCapture(), 201));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "capture-request-id",
      amountMinor: 4900,
      currency: "ILS",
    })).resolves.toEqual({
      status: "completed",
      paypalOrderId: "PAYPAL_ORDER_1",
      captureId: "CAPTURE_1",
      amountMinor: 4900,
      currency: "ILS",
    });
  });

  it("returns non-completed state without inventing a capture", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ id: "PAYPAL_ORDER_1", status: "PAYER_ACTION_REQUIRED" }, 201));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "capture-request-id",
      amountMinor: 4900,
      currency: "ILS",
    })).resolves.toEqual({
      status: "not_completed",
      paypalOrderId: "PAYPAL_ORDER_1",
      paypalStatus: "PAYER_ACTION_REQUIRED",
    });
  });

  it("recovers a lost capture response using authoritative order details", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({
        name: "UNPROCESSABLE_ENTITY",
        details: [{ issue: "ORDER_ALREADY_CAPTURED" }],
        debug_id: "debug-id",
      }, 422))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-2", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse(completedCapture()));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    const result = await paypal.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "capture-request-id",
      amountMinor: 4900,
      currency: "ILS",
    });
    expect(result.status).toBe("completed");
    expect(fetchImpl.mock.calls[3]?.[0]).toBe(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL_ORDER_1",
    );
  });

  it("rejects malformed OAuth and mismatched capture relationships with safe errors", async () => {
    const malformedOAuth = createPayPalClient({
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ token_type: "Bearer" })),
      config: testConfig,
    });
    await expect(malformedOAuth.createOrder({
      localOrderId: "11111111-1111-4111-8111-111111111111",
      amountMinor: 4900,
      currency: "ILS",
      requestId: "request",
    })).rejects.toMatchObject({ safeCode: "malformed_oauth_response" });

    const mismatch = createPayPalClient({
      fetchImpl: vi.fn()
        .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
        .mockResolvedValueOnce(jsonResponse(completedCapture({ id: "OTHER_ORDER" }), 201)),
      config: testConfig,
    });
    await expect(mismatch.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "request",
      amountMinor: 4900,
      currency: "ILS",
    })).rejects.toBeInstanceOf(PayPalApiError);
  });

  it("accepts the real capture contract without purchase-unit custom_id", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse(completedCapture(), 201));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "capture-request-id",
      amountMinor: 4900,
      currency: "ILS",
    })).resolves.toMatchObject({ status: "completed", captureId: "CAPTURE_1" });
    const captureHeaders = fetchImpl.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(captureHeaders.Prefer).toBe("return=representation");
  });

  it("recovers a minimal successful capture response through Show Order", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ id: "PAYPAL_ORDER_1", status: "COMPLETED", links: [] }, 201))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-2", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse(completedCapture()));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "capture-request-id",
      amountMinor: 4900,
      currency: "ILS",
    })).resolves.toMatchObject({ status: "completed", captureId: "CAPTURE_1" });
    expect(fetchImpl.mock.calls[3]?.[0]).toBe(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL_ORDER_1",
    );
  });

  it("recovers when the capture response is lost after PayPal completes the payment", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", token_type: "Bearer" }))
      .mockRejectedValueOnce(new TypeError("network response lost"))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-2", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse(completedCapture()));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      requestId: "capture-request-id",
      amountMinor: 4900,
      currency: "ILS",
    })).resolves.toMatchObject({ status: "completed", captureId: "CAPTURE_1" });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[3]?.[0]).toBe(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL_ORDER_1",
    );
  });

  it.each([
    ["wrong reference", completedCapture({ purchase_units: [{
      reference_id: "other-order",
      payments: { captures: [{ id: "CAPTURE_1", status: "COMPLETED", amount: { value: "49.00", currency_code: "ILS" } }] },
    }] }), "order_relationship_mismatch"],
    ["wrong amount", completedCapture({ purchase_units: [{
      reference_id: "11111111-1111-4111-8111-111111111111",
      payments: { captures: [{ id: "CAPTURE_1", status: "COMPLETED", amount: { value: "39.00", currency_code: "ILS" } }] },
    }] }), "amount_mismatch"],
    ["wrong currency", completedCapture({ purchase_units: [{
      reference_id: "11111111-1111-4111-8111-111111111111",
      payments: { captures: [{ id: "CAPTURE_1", status: "COMPLETED", amount: { value: "49.00", currency_code: "USD" } }] },
    }] }), "currency_mismatch"],
  ])("rejects %s after authoritative Show Order validation", async (_label, payload, safeCode) => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse(payload));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.showOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      amountMinor: 4900,
      currency: "ILS",
    })).rejects.toMatchObject({ safeCode });
  });

  it("does not accept a non-completed capture", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ id: "PAYPAL_ORDER_1", status: "APPROVED", purchase_units: [] }));
    const paypal = createPayPalClient({ fetchImpl, config: testConfig });
    await expect(paypal.showOrder({
      paypalOrderId: "PAYPAL_ORDER_1",
      localOrderId: "11111111-1111-4111-8111-111111111111",
      amountMinor: 4900,
      currency: "ILS",
    })).resolves.toEqual({
      status: "not_completed", paypalOrderId: "PAYPAL_ORDER_1", paypalStatus: "APPROVED",
    });
  });
});
