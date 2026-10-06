import type { NextApiRequest, NextApiResponse } from "next";
import { finalizeLocalOrderPaid } from "@/lib/server/commerce/finalizePaidOrder";
import { createPayPalClient, PayPalApiError } from "@/lib/server/commerce/paypal/client";
import { getPayPalWebhookConfig } from "@/lib/server/commerce/paypal/config";
import { getPayPalCheckoutOrderByProviderOrderId } from "@/lib/server/commerce/paypal/orders";
import {
  getPayPalWebhookReferences,
  parsePayPalTransmissionHeaders,
  parsePayPalWebhookEvent,
  PAYPAL_FULFILLMENT_EVENT,
  PAYPAL_REVIEW_EVENT_TYPES,
} from "@/lib/server/commerce/paypal/webhooks";
import {
  claimPaymentProviderEvent,
  ProviderEventIdentityConflictError,
  setPaymentProviderEventStatus,
} from "@/lib/server/commerce/providerEvents";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";
import { sendDiscordErrorAlert } from "@/lib/monitoring/discordAlert";
import { withApiHandler } from "@/utils/apiHandler";

const MAX_WEBHOOK_BODY_BYTES = 128 * 1024;

type PayPalWebhookResponse =
  | { ok: true; status: "processed" | "already_processed" | "ignored" }
  | { ok: false; code: string };

class WebhookBodyTooLargeError extends Error {}

async function readRawBody(req: NextApiRequest) {
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body) > MAX_WEBHOOK_BODY_BYTES) throw new WebhookBodyTooLargeError();
    return req.body;
  }
  if (Buffer.isBuffer(req.body)) {
    if (req.body.byteLength > MAX_WEBHOOK_BODY_BYTES) throw new WebhookBodyTooLargeError();
    return req.body.toString("utf8");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_WEBHOOK_BODY_BYTES) throw new WebhookBodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function safeWebhookError(input: {
  code: string;
  eventId?: string | null;
  localOrderId?: string | null;
  providerOrderId?: string | null;
  environment?: string | null;
}) {
  return new Error([
    "PayPal webhook reconciliation failed",
    `code=${input.code}`,
    `event=${input.eventId ?? "unknown"}`,
    `order=${input.localOrderId ?? "unknown"}`,
    `paypal=${input.providerOrderId ?? "unknown"}`,
    `environment=${input.environment ?? "unknown"}`,
  ].join(" "));
}

async function markFailed(eventId: string, failureCode: string) {
  await setPaymentProviderEventStatus({ eventId, status: "failed", failureCode });
}

async function alertReconciliationFailure(error: unknown, environment: string) {
  await captureAndAlertServerError(error, {
    route: "/api/webhooks/paypal",
    method: "POST",
    runtime: "server",
    environment,
    statusCode: 503,
  });
}

export async function paypalWebhookHandler(
  req: NextApiRequest,
  res: NextApiResponse<PayPalWebhookResponse>,
) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    if (error instanceof WebhookBodyTooLargeError) {
      res.status(413).json({ ok: false, code: "payload_too_large" });
      return;
    }
    throw error;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ ok: false, code: "malformed_event" });
    return;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    res.status(400).json({ ok: false, code: "malformed_event" });
    return;
  }

  const transmission = parsePayPalTransmissionHeaders(req.headers);
  if (!transmission) {
    res.status(400).json({ ok: false, code: "missing_signature_headers" });
    return;
  }

  let paypalConfig;
  try {
    paypalConfig = getPayPalWebhookConfig();
  } catch {
    res.status(503).json({ ok: false, code: "paypal_webhook_unavailable" });
    return;
  }

  const paypal = createPayPalClient({ config: paypalConfig });
  let signatureValid: boolean;
  try {
    signatureValid = await paypal.verifyWebhookSignature({
      transmission,
      webhookId: paypalConfig.webhookId,
      webhookEvent: payload as Record<string, unknown>,
    });
  } catch (error) {
    if (error instanceof PayPalApiError) {
      console.error(JSON.stringify({
        level: "error",
        message: "PayPal webhook signature verification unavailable",
        paypalHttpStatus: error.httpStatus,
        paypalCode: error.safeCode,
        paypalDebugId: error.debugId,
        environment: paypalConfig.environment,
      }));
      res.status(503).json({ ok: false, code: "signature_verification_unavailable" });
      return;
    }
    throw error;
  }
  if (!signatureValid) {
    res.status(401).json({ ok: false, code: "invalid_signature" });
    return;
  }

  const event = parsePayPalWebhookEvent(payload);
  if (!event) {
    res.status(400).json({ ok: false, code: "malformed_event" });
    return;
  }
  const references = getPayPalWebhookReferences(event);

  let claim;
  try {
    claim = await claimPaymentProviderEvent({
      provider: "paypal",
      providerEventId: event.id,
      eventType: event.eventType,
      transmissionId: transmission.transmissionId,
      providerOrderId: references.providerOrderId,
      providerCaptureId: references.providerCaptureId,
      rawPayload: rawBody,
    });
  } catch (error) {
    if (error instanceof ProviderEventIdentityConflictError) {
      res.status(409).json({ ok: false, code: "event_identity_conflict" });
      return;
    }
    throw error;
  }

  if (!claim.claimed) {
    if (claim.status === "processed" || claim.status === "ignored") {
      res.status(200).json({
        ok: true,
        status: claim.status === "processed" ? "already_processed" : "ignored",
      });
      return;
    }
    res.status(503).json({ ok: false, code: "event_processing" });
    return;
  }

  if (event.eventType !== PAYPAL_FULFILLMENT_EVENT) {
    await setPaymentProviderEventStatus({ eventId: claim.eventId, status: "ignored" });
    if (PAYPAL_REVIEW_EVENT_TYPES.has(event.eventType)) {
      await sendDiscordErrorAlert({
        title: `PayPal payment event requires review: ${event.eventType} event=${event.id}`,
        level: "warning",
        route: "/api/webhooks/paypal",
        method: "POST",
        runtime: "server",
        environment: paypalConfig.environment,
        statusCode: 200,
      });
    }
    res.status(200).json({ ok: true, status: "ignored" });
    return;
  }

  const failureContext = {
    eventId: event.id,
    providerOrderId: references.providerOrderId,
    environment: paypalConfig.environment,
  };
  if (!references.providerOrderId || !references.providerCaptureId) {
    await markFailed(claim.eventId, "invalid_event_reference");
    await alertReconciliationFailure(safeWebhookError({
      ...failureContext,
      code: "invalid_event_reference",
    }), paypalConfig.environment);
    res.status(422).json({ ok: false, code: "invalid_event_reference" });
    return;
  }

  let localOrder;
  try {
    localOrder = await getPayPalCheckoutOrderByProviderOrderId(references.providerOrderId);
  } catch (error) {
    await markFailed(claim.eventId, "order_lookup_failed");
    await alertReconciliationFailure(safeWebhookError({
      ...failureContext,
      code: "order_lookup_failed",
    }), paypalConfig.environment);
    res.status(503).json({ ok: false, code: "order_lookup_failed" });
    return;
  }
  if (!localOrder) {
    await markFailed(claim.eventId, "order_not_found");
    await alertReconciliationFailure(safeWebhookError({
      ...failureContext,
      code: "order_not_found",
    }), paypalConfig.environment);
    res.status(503).json({ ok: false, code: "order_not_found" });
    return;
  }

  try {
    const authoritativePayment = await paypal.showOrder({
      paypalOrderId: references.providerOrderId,
      localOrderId: localOrder.orderId,
      amountMinor: localOrder.totalMinor,
      currency: localOrder.currency,
    });
    if (authoritativePayment.status !== "completed") {
      await markFailed(claim.eventId, "payment_not_completed");
      await alertReconciliationFailure(safeWebhookError({
        ...failureContext,
        localOrderId: localOrder.orderId,
        code: "payment_not_completed",
      }), paypalConfig.environment);
      res.status(503).json({ ok: false, code: "payment_not_completed" });
      return;
    }
    if (authoritativePayment.captureId !== references.providerCaptureId) {
      await markFailed(claim.eventId, "capture_mismatch");
      await alertReconciliationFailure(safeWebhookError({
        ...failureContext,
        localOrderId: localOrder.orderId,
        code: "capture_mismatch",
      }), paypalConfig.environment);
      res.status(422).json({ ok: false, code: "capture_mismatch" });
      return;
    }

    const finalization = await finalizeLocalOrderPaid({
      orderId: localOrder.orderId,
      provider: "paypal",
      providerOrderId: references.providerOrderId,
      providerCaptureId: authoritativePayment.captureId,
      confirmedAmountMinor: authoritativePayment.amountMinor,
      confirmedCurrency: authoritativePayment.currency,
      providerEventRecordId: claim.eventId,
    });
    if (finalization.result !== "paid" && finalization.result !== "already_paid") {
      await markFailed(claim.eventId, `finalizer_${finalization.result}`);
      await alertReconciliationFailure(safeWebhookError({
        ...failureContext,
        localOrderId: localOrder.orderId,
        code: `finalizer_${finalization.result}`,
      }), paypalConfig.environment);
      res.status(422).json({ ok: false, code: "payment_verification_failed" });
      return;
    }

    res.status(200).json({
      ok: true,
      status: finalization.result === "paid" ? "processed" : "already_processed",
    });
  } catch (error) {
    const failureCode = error instanceof PayPalApiError
      ? `paypal_${error.safeCode.toLowerCase().replace(/[^a-z0-9_.-]+/gu, "_").slice(0, 60)}`
      : "reconciliation_failed";
    const permanentValidationFailure = error instanceof PayPalApiError && new Set([
      "amount_mismatch",
      "currency_mismatch",
      "order_relationship_mismatch",
      "malformed_capture_response",
    ]).has(error.safeCode);
    await markFailed(claim.eventId, failureCode);
    await alertReconciliationFailure(safeWebhookError({
      ...failureContext,
      localOrderId: localOrder.orderId,
      code: failureCode,
    }), paypalConfig.environment);
    res.status(permanentValidationFailure ? 422 : 503).json({
      ok: false,
      code: permanentValidationFailure ? "payment_verification_failed" : "reconciliation_unavailable",
    });
  }
}

export const config = { api: { bodyParser: false } };

export default withApiHandler<PayPalWebhookResponse>(
  {
    guard: {
      methods: ["POST"],
      limit: 300,
      windowMs: 60_000,
      maxBodyBytes: MAX_WEBHOOK_BODY_BYTES,
      keyPrefix: "paypal-webhook",
    },
  },
  paypalWebhookHandler,
);
