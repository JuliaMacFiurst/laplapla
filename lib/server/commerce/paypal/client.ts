import { getPayPalServerConfig, type PayPalServerConfig } from "@/lib/server/commerce/paypal/config";

type FetchLike = typeof fetch;

type PayPalErrorPayload = {
  name?: unknown;
  debug_id?: unknown;
  details?: unknown;
};

export class PayPalApiError extends Error {
  readonly httpStatus: number;
  readonly safeCode: string;
  readonly debugId: string | null;

  constructor(input: { httpStatus: number; safeCode: string; debugId?: string | null }) {
    super(`PayPal request failed (${input.safeCode}, HTTP ${input.httpStatus})`);
    this.name = "PayPalApiError";
    this.httpStatus = input.httpStatus;
    this.safeCode = input.safeCode;
    this.debugId = input.debugId ?? null;
  }
}

export type PayPalCreatedOrder = {
  id: string;
  status: "CREATED";
};

export type PayPalCaptureResult =
  | {
      status: "completed";
      paypalOrderId: string;
      captureId: string;
      amountMinor: number;
      currency: string;
    }
  | {
      status: "not_completed";
      paypalOrderId: string;
      paypalStatus: string;
    };

export type PayPalWebhookTransmission = {
  transmissionId: string;
  transmissionTime: string;
  transmissionSignature: string;
  certificateUrl: string;
  authAlgorithm: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : null;
}

function providerIdentifier(value: unknown) {
  const candidate = safeString(value, 128);
  return candidate && /^[A-Za-z0-9_-]+$/u.test(candidate) ? candidate : null;
}

function malformedPayPalResponse(message: string) {
  return new PayPalApiError({ httpStatus: 502, safeCode: message });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readPayPalError(payload: unknown, httpStatus: number) {
  const body = isRecord(payload) ? payload as PayPalErrorPayload : {};
  const details = Array.isArray(body.details) ? body.details : [];
  const detail = details.find(isRecord);
  const detailIssue = detail ? safeString(detail.issue, 100) : null;
  const name = safeString(body.name, 100);
  const debugId = safeString(body.debug_id, 100);
  return new PayPalApiError({
    httpStatus,
    safeCode: detailIssue ?? name ?? "paypal_request_failed",
    debugId,
  });
}

function formatMinorAmount(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("A valid PayPal amount is required");
  }
  return `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, "0")}`;
}

function parseMinorAmount(value: unknown) {
  if (typeof value !== "string" || !/^\d+\.\d{2}$/u.test(value)) return null;
  const [whole, fractional] = value.split(".");
  const amount = Number(whole) * 100 + Number(fractional);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function parseCreatedOrder(payload: unknown): PayPalCreatedOrder {
  if (!isRecord(payload)) throw malformedPayPalResponse("malformed_create_response");
  const id = providerIdentifier(payload.id);
  if (!id || payload.status !== "CREATED") {
    throw malformedPayPalResponse("malformed_create_response");
  }
  return { id, status: "CREATED" };
}

function parseCaptureResult(payload: unknown, expected: {
  paypalOrderId: string;
  localOrderId: string;
  amountMinor: number;
  currency: string;
}): PayPalCaptureResult {
  if (!isRecord(payload)) throw malformedPayPalResponse("malformed_capture_response");
  const paypalOrderId = providerIdentifier(payload.id);
  const paypalStatus = safeString(payload.status, 60);
  if (paypalOrderId !== expected.paypalOrderId || !paypalStatus) {
    throw malformedPayPalResponse("malformed_capture_response");
  }

  if (paypalStatus !== "COMPLETED") {
    return { status: "not_completed", paypalOrderId, paypalStatus };
  }

  if (!Array.isArray(payload.purchase_units)) {
    throw malformedPayPalResponse("malformed_capture_response");
  }

  const matchingUnits = payload.purchase_units.filter((value) => (
    isRecord(value) && value.reference_id === expected.localOrderId
  ));
  const matchingUnit = matchingUnits.length === 1 ? matchingUnits[0] : null;
  if (!isRecord(matchingUnit) || !isRecord(matchingUnit.payments)) {
    throw malformedPayPalResponse("order_relationship_mismatch");
  }
  if (matchingUnit.custom_id !== undefined && matchingUnit.custom_id !== expected.localOrderId) {
    throw malformedPayPalResponse("order_relationship_mismatch");
  }

  const captures = Array.isArray(matchingUnit.payments.captures)
    ? matchingUnit.payments.captures.filter(isRecord)
    : [];
  const completedCaptures = captures.filter((capture) => capture.status === "COMPLETED");
  if (completedCaptures.length !== 1) {
    throw malformedPayPalResponse("malformed_capture_response");
  }

  const capture = completedCaptures[0];
  const captureId = providerIdentifier(capture.id);
  const amount = isRecord(capture.amount) ? capture.amount : null;
  const amountMinor = amount ? parseMinorAmount(amount.value) : null;
  const currency = amount ? safeString(amount.currency_code, 3) : null;
  if (!captureId || amountMinor === null || !currency) {
    throw malformedPayPalResponse("malformed_capture_response");
  }
  if (amountMinor !== expected.amountMinor) {
    throw malformedPayPalResponse("amount_mismatch");
  }
  if (currency !== expected.currency) {
    throw malformedPayPalResponse("currency_mismatch");
  }

  return {
    status: "completed",
    paypalOrderId,
    captureId,
    amountMinor,
    currency,
  };
}

export function createPayPalClient(options?: {
  fetchImpl?: FetchLike;
  config?: PayPalServerConfig;
}) {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const config = options?.config ?? getPayPalServerConfig();

  async function getAccessToken() {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64");
    const response = await fetchImpl(`${config.apiBaseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });
    const payload = await readJson(response);
    if (!response.ok) throw readPayPalError(payload, response.status);
    if (!isRecord(payload)) throw malformedPayPalResponse("malformed_oauth_response");
    const accessToken = safeString(payload.access_token, 4096);
    const tokenType = safeString(payload.token_type, 40);
    if (!accessToken || tokenType?.toLowerCase() !== "bearer") {
      throw malformedPayPalResponse("malformed_oauth_response");
    }
    return accessToken;
  }

  async function authenticatedRequest(path: string, init: RequestInit) {
    const accessToken = await getAccessToken();
    const response = await fetchImpl(`${config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
    const payload = await readJson(response);
    if (!response.ok) throw readPayPalError(payload, response.status);
    return payload;
  }

  async function createOrder(input: {
      localOrderId: string;
      amountMinor: number;
      currency: string;
      requestId: string;
    }) {
      const payload = await authenticatedRequest("/v2/checkout/orders", {
        method: "POST",
        headers: { "PayPal-Request-Id": input.requestId },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: input.localOrderId,
            custom_id: input.localOrderId,
            amount: {
              currency_code: input.currency,
              value: formatMinorAmount(input.amountMinor),
            },
          }],
        }),
      });
    return parseCreatedOrder(payload);
  }

  async function showOrder(input: {
    paypalOrderId: string;
    localOrderId: string;
    amountMinor: number;
    currency: string;
  }) {
    const payload = await authenticatedRequest(
      `/v2/checkout/orders/${encodeURIComponent(input.paypalOrderId)}`,
      { method: "GET" },
    );
    return parseCaptureResult(payload, input);
  }

  async function captureOrder(input: {
      paypalOrderId: string;
      localOrderId: string;
      requestId: string;
      amountMinor: number;
      currency: string;
    }) {
    let payload: unknown;
    try {
      payload = await authenticatedRequest(
        `/v2/checkout/orders/${encodeURIComponent(input.paypalOrderId)}/capture`,
        {
          method: "POST",
          headers: {
            "PayPal-Request-Id": input.requestId,
            Prefer: "return=representation",
          },
          body: "{}",
        },
      );
    } catch (error) {
      if (
        !(error instanceof PayPalApiError) ||
        error.safeCode === "ORDER_ALREADY_CAPTURED" ||
        error.httpStatus >= 500
      ) {
        try {
          return await showOrder(input);
        } catch {
          throw error;
        }
      }
      throw error;
    }

    try {
      return parseCaptureResult(payload, input);
    } catch (error) {
      if (error instanceof PayPalApiError && error.httpStatus === 502) {
        try {
          return await showOrder(input);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  }

  async function verifyWebhookSignature(input: {
    transmission: PayPalWebhookTransmission;
    webhookId: string;
    webhookEvent: Record<string, unknown>;
  }) {
    const payload = await authenticatedRequest("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: input.transmission.authAlgorithm,
        cert_url: input.transmission.certificateUrl,
        transmission_id: input.transmission.transmissionId,
        transmission_sig: input.transmission.transmissionSignature,
        transmission_time: input.transmission.transmissionTime,
        webhook_id: input.webhookId,
        webhook_event: input.webhookEvent,
      }),
    });

    if (!isRecord(payload) || !safeString(payload.verification_status, 20)) {
      throw malformedPayPalResponse("malformed_webhook_verification_response");
    }

    return payload.verification_status === "SUCCESS";
  }

  return {
    createOrder,
    showOrder,
    captureOrder,
    verifyWebhookSignature,
  };
}
