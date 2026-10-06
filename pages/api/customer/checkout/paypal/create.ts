import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { createLocalCommerceOrder } from "@/lib/server/commerce/orders";
import { createPayPalClient, PayPalApiError } from "@/lib/server/commerce/paypal/client";
import { getPayPalServerConfig } from "@/lib/server/commerce/paypal/config";
import {
  bindPayPalOrderToLocalOrder,
  getPayPalCheckoutOrderForCustomer,
} from "@/lib/server/commerce/paypal/orders";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import { PAYPAL_CHECKOUT_PRODUCT_ID, type PayPalCreateResponse } from "@/lib/shop/paypalCheckout";
import { getProductById } from "@/lib/shop/catalog";
import { withApiHandler } from "@/utils/apiHandler";
import { BillingIdentityError, requireTrustedBillingIdentity } from "@/lib/server/customerBillingIdentity";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EXPECTED_BODY_KEYS = ["checkoutIdempotencyKey", "productId"];

function parseBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!Object.keys(value).every((key) => EXPECTED_BODY_KEYS.includes(key))) return null;
  const body = value as { productId?: unknown; checkoutIdempotencyKey?: unknown };
  if (body.productId !== PAYPAL_CHECKOUT_PRODUCT_ID) return null;
  if (typeof body.checkoutIdempotencyKey !== "string" || !UUID_PATTERN.test(body.checkoutIdempotencyKey)) return null;
  return { productId: body.productId, checkoutIdempotencyKey: body.checkoutIdempotencyKey };
}

export async function paypalCreateHandler(req: NextApiRequest, res: NextApiResponse<PayPalCreateResponse>) {
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

  let paypalConfig;
  try {
    paypalConfig = getPayPalServerConfig();
  } catch {
    res.status(503).json({ ok: false, code: "paypal_unavailable" });
    return;
  }
  const product = getProductById(body.productId);
  if (!product || (paypalConfig.environment !== "sandbox" && product.status !== "active")) {
    res.status(409).json({ ok: false, code: "order_unavailable" });
    return;
  }

  let identity;
  try {
    identity = await requireTrustedBillingIdentity(access.user);
  } catch (error) {
    if (error instanceof BillingIdentityError) {
      res.status(409).json({ ok: false, code: "billing_identity_required" });
      return;
    }
    throw error;
  }

  const localResult = await createLocalCommerceOrder({
    verifiedCustomer: access.user,
    productId: body.productId,
    checkoutIdempotencyKey: body.checkoutIdempotencyKey,
    billingName: identity.billingName,
    verifiedEmail: identity.email,
    providerEnvironment: paypalConfig.environment,
  });
  if (localResult.status === "already_owned") {
    res.status(200).json({ ok: true, status: "already_owned", productId: localResult.productId });
    return;
  }
  if (localResult.status === "needs_reconciliation") {
    res.status(200).json({
      ok: true,
      status: "needs_reconciliation",
      productId: body.productId,
    });
    return;
  }

  let localOrder = await getPayPalCheckoutOrderForCustomer(localResult.order.orderId, access.user.id);
  if (!localOrder) {
    res.status(409).json({ ok: false, code: "order_unavailable" });
    return;
  }
  if (localOrder.status === "paid") {
    res.status(200).json({ ok: true, status: "already_owned", productId: localOrder.productId });
    return;
  }
  if (localOrder.status === "capture_pending") {
    if (!localOrder.providerOrderId) {
      res.status(409).json({ ok: false, code: "order_unavailable" });
      return;
    }
    res.status(200).json({
      ok: true,
      status: "reconcile_required",
      localOrderId: localOrder.orderId,
      paypalOrderId: localOrder.providerOrderId,
      amountMinor: localOrder.totalMinor,
      currency: localOrder.currency,
    });
    return;
  }
  if (localOrder.providerOrderId) {
    if (localOrder.status !== "pending_approval") {
      res.status(409).json({ ok: false, code: "order_unavailable" });
      return;
    }
    res.status(200).json({
      ok: true,
      status: "pending_approval",
      localOrderId: localOrder.orderId,
      paypalOrderId: localOrder.providerOrderId,
      amountMinor: localOrder.totalMinor,
      currency: localOrder.currency,
    });
    return;
  }
  if (localOrder.status !== "creating") {
    res.status(409).json({ ok: false, code: "order_unavailable" });
    return;
  }

  try {
    const paypal = createPayPalClient({ config: paypalConfig });
    const providerOrder = await paypal.createOrder({
      localOrderId: localOrder.orderId,
      amountMinor: localOrder.totalMinor,
      currency: localOrder.currency,
      requestId: localOrder.paypalCreateRequestId,
    });
    const binding = await bindPayPalOrderToLocalOrder({
      orderId: localOrder.orderId,
      paypalOrderId: providerOrder.id,
    });
    if (binding.result !== "bound" && binding.result !== "already_bound") {
      res.status(409).json({ ok: false, code: "order_unavailable" });
      return;
    }
    localOrder = { ...localOrder, status: "pending_approval", providerOrderId: providerOrder.id };
    res.status(200).json({
      ok: true,
      status: "pending_approval",
      localOrderId: localOrder.orderId,
      paypalOrderId: providerOrder.id,
      amountMinor: localOrder.totalMinor,
      currency: localOrder.currency,
    });
  } catch (error) {
    if (error instanceof PayPalApiError) {
      console.error(JSON.stringify({
        level: "error",
        message: "PayPal create order failed",
        internalOrderId: localOrder.orderId,
        lifecycle: localOrder.status,
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

export default withApiHandler<PayPalCreateResponse>(
  {
    guard: {
      methods: ["POST"], limit: 12, windowMs: 60_000, maxBodyBytes: 2 * 1024,
      keyPrefix: "paypal-create",
    },
  },
  paypalCreateHandler,
);
