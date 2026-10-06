import type { PayPalWebhookTransmission } from "@/lib/server/commerce/paypal/client";

export const PAYPAL_FULFILLMENT_EVENT = "PAYMENT.CAPTURE.COMPLETED";

export const PAYPAL_REVIEW_EVENT_TYPES = new Set([
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.REVERSED",
  "CHECKOUT.PAYMENT-APPROVAL.REVERSED",
  "CUSTOMER.DISPUTE.CREATED",
  "CUSTOMER.DISPUTE.UPDATED",
  "CUSTOMER.DISPUTE.RESOLVED",
]);

type UnknownRecord = Record<string, unknown>;

export type ParsedPayPalWebhook = {
  id: string;
  eventType: string;
  resource: UnknownRecord;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeIdentifier(value: unknown, maxLength: number) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && /^[A-Za-z0-9_.-]+$/u.test(value)
    ? value
    : null;
}

function requiredHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
  maxLength: number,
) {
  const value = headers[name];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) return null;
  return value.trim();
}

export function parsePayPalTransmissionHeaders(
  headers: Record<string, string | string[] | undefined>,
): PayPalWebhookTransmission | null {
  const transmissionId = requiredHeader(headers, "paypal-transmission-id", 180);
  const transmissionTime = requiredHeader(headers, "paypal-transmission-time", 100);
  const transmissionSignature = requiredHeader(headers, "paypal-transmission-sig", 2048);
  const certificateUrl = requiredHeader(headers, "paypal-cert-url", 2048);
  const authAlgorithm = requiredHeader(headers, "paypal-auth-algo", 100);

  if (!transmissionId || !transmissionTime || !transmissionSignature || !certificateUrl || !authAlgorithm) {
    return null;
  }

  let parsedCertificateUrl: URL;
  try {
    parsedCertificateUrl = new URL(certificateUrl);
  } catch {
    return null;
  }
  if (parsedCertificateUrl.protocol !== "https:") return null;

  return {
    transmissionId,
    transmissionTime,
    transmissionSignature,
    certificateUrl,
    authAlgorithm,
  };
}

export function parsePayPalWebhookEvent(payload: unknown): ParsedPayPalWebhook | null {
  if (!isRecord(payload) || !isRecord(payload.resource)) return null;
  const id = safeIdentifier(payload.id, 180);
  const eventType = safeIdentifier(payload.event_type, 160);
  if (!id || !eventType) return null;
  return { id, eventType, resource: payload.resource };
}

export function getPayPalWebhookReferences(event: ParsedPayPalWebhook) {
  const supplementaryData = isRecord(event.resource.supplementary_data)
    ? event.resource.supplementary_data
    : null;
  const relatedIds = supplementaryData && isRecord(supplementaryData.related_ids)
    ? supplementaryData.related_ids
    : null;
  const providerOrderId = safeIdentifier(relatedIds?.order_id, 128);
  const relatedCaptureId = safeIdentifier(relatedIds?.capture_id, 128);
  const resourceId = safeIdentifier(event.resource.id, 128);
  const providerCaptureId = event.eventType.startsWith("PAYMENT.CAPTURE.")
    && event.eventType !== "PAYMENT.CAPTURE.REFUNDED"
    ? resourceId
    : relatedCaptureId;

  return { providerOrderId, providerCaptureId };
}
