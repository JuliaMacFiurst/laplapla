import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { finalizeLocalOrderPaid } from "@/lib/server/commerce/finalizePaidOrder";
import { createPayPalClient, PayPalApiError } from "@/lib/server/commerce/paypal/client";
import { getPayPalServerConfig } from "@/lib/server/commerce/paypal/config";
import {
  beginPayPalOrderCapture,
  getPayPalCheckoutOrderForCustomer,
} from "@/lib/server/commerce/paypal/orders";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import { PAYPAL_CHECKOUT_PRODUCT_ID, type PayPalCaptureResponse } from "@/lib/shop/paypalCheckout";
import { withApiHandler } from "@/utils/apiHandler";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const PROVIDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const EXPECTED_BODY_KEYS = ["localOrderId", "paypalOrderId"];

function parseBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!Object.keys(value).every((key) => EXPECTED_BODY_KEYS.includes(key))) return null;
  const body = value as { localOrderId?: unknown; paypalOrderId?: unknown };
  if (typeof body.localOrderId !== "string" || !UUID_PATTERN.test(body.localOrderId)) return null;
  if (typeof body.paypalOrderId !== "string" || !PROVIDER_ID_PATTERN.test(body.paypalOrderId)) return null;
  return { localOrderId: body.localOrderId, paypalOrderId: body.paypalOrderId };
}

export async function paypalCaptureHandler(req: NextApiRequest, res: NextApiResponse<PayPalCaptureResponse>) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!enforceSameOrigin(req, res)) return;
  const body = parseBody(req.body);
  if (!body) {
    res.status(400).json({ ok: false, code: "invalid_request" });
    return;
  }

  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ ok: false, code: "authentication_required" });
    return;
  }

  const localOrder = await getPayPalCheckoutOrderForCustomer(body.localOrderId, access.user.id);
  if (!localOrder) {
    res.status(404).json({ ok: false, code: "order_not_found" });
    return;
  }
  if (localOrder.productId !== PAYPAL_CHECKOUT_PRODUCT_ID) {
    res.status(409).json({ ok: false, code: "order_mismatch" });
    return;
  }
  if (localOrder.providerOrderId !== body.paypalOrderId) {
    res.status(409).json({ ok: false, code: "order_mismatch" });
    return;
  }
  if (localOrder.status === "paid") {
    res.status(200).json({
      ok: true,
      status: "paid",
      localOrderId: localOrder.orderId,
      entitlementId: localOrder.entitlementId,
    });
    return;
  }

  let paypalConfig;
  try {
    paypalConfig = getPayPalServerConfig();
  } catch {
    res.status(503).json({ ok: false, code: "paypal_unavailable" });
    return;
  }

  const captureStart = await beginPayPalOrderCapture({
    orderId: localOrder.orderId,
    userId: access.user.id,
    paypalOrderId: body.paypalOrderId,
  });
  if (captureStart.result === "already_paid") {
    res.status(200).json({
      ok: true,
      status: "paid",
      localOrderId: localOrder.orderId,
      entitlementId: localOrder.entitlementId,
    });
    return;
  }
  if (captureStart.result !== "capture_ready") {
    res.status(409).json({ ok: false, code: "order_mismatch" });
    return;
  }

  try {
    const capture = await createPayPalClient({ config: paypalConfig }).captureOrder({
      paypalOrderId: body.paypalOrderId,
      localOrderId: localOrder.orderId,
      requestId: localOrder.paypalCaptureRequestId,
    });
    if (capture.status !== "completed") {
      res.status(409).json({ ok: false, code: "payment_not_completed" });
      return;
    }

    const finalization = await finalizeLocalOrderPaid({
      orderId: localOrder.orderId,
      provider: "paypal",
      providerOrderId: body.paypalOrderId,
      providerCaptureId: capture.captureId,
      confirmedAmountMinor: capture.amountMinor,
      confirmedCurrency: capture.currency,
    });
    if (finalization.result !== "paid" && finalization.result !== "already_paid") {
      res.status(409).json({ ok: false, code: "payment_verification_failed" });
      return;
    }

    res.status(200).json({
      ok: true,
      status: "paid",
      localOrderId: localOrder.orderId,
      entitlementId: finalization.entitlementId,
    });
  } catch (error) {
    if (error instanceof PayPalApiError) {
      console.error(JSON.stringify({
        level: "error",
        message: "PayPal capture failed",
        internalOrderId: localOrder.orderId,
        lifecycle: captureStart.status,
        paypalHttpStatus: error.httpStatus,
        paypalCode: error.safeCode,
        paypalDebugId: error.debugId,
      }));
      res.status(502).json({ ok: false, code: "paypal_unavailable" });
      return;
    }
    throw error;
  }
}

export const config = { api: { bodyParser: { sizeLimit: "2kb" } } };

export default withApiHandler<PayPalCaptureResponse>(
  {
    guard: {
      methods: ["POST"], limit: 12, windowMs: 60_000, maxBodyBytes: 2 * 1024,
      keyPrefix: "paypal-capture",
    },
  },
  paypalCaptureHandler,
);
