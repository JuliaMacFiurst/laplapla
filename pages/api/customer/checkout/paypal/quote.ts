import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { resolveProductPrice } from "@/lib/server/commerce/resolveProductPrice";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import { PAYPAL_CHECKOUT_PRODUCT_ID, type PayPalQuoteResponse } from "@/lib/shop/paypalCheckout";
import { withApiHandler } from "@/utils/apiHandler";

const EXPECTED_BODY_KEYS = ["productId"];

function hasAllowedBody(value: unknown): value is { productId: string } {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every((key) => EXPECTED_BODY_KEYS.includes(key)) &&
    (value as { productId?: unknown }).productId === PAYPAL_CHECKOUT_PRODUCT_ID,
  );
}

export async function paypalQuoteHandler(req: NextApiRequest, res: NextApiResponse<PayPalQuoteResponse>) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!enforceSameOrigin(req, res)) return;
  if (!hasAllowedBody(req.body)) {
    res.status(400).json({ ok: false, code: "invalid_request" });
    return;
  }

  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ ok: false, code: "authentication_required" });
    return;
  }

  try {
    const result = await resolveProductPrice({
      verifiedCustomer: access.user,
      productId: PAYPAL_CHECKOUT_PRODUCT_ID,
    });
    if (result.status === "already_owned") {
      res.status(200).json({ ok: true, ...result });
      return;
    }
    res.status(200).json({
      ok: true,
      status: "priced",
      productId: result.productId,
      amountMinor: result.priceMinor,
      currency: result.currency,
      priceSource: result.source,
    });
  } catch {
    res.status(503).json({ ok: false, code: "unavailable" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "2kb" } } };

export default withApiHandler<PayPalQuoteResponse>(
  {
    guard: {
      methods: ["POST"], limit: 30, windowMs: 60_000, maxBodyBytes: 2 * 1024,
      keyPrefix: "paypal-quote",
    },
  },
  paypalQuoteHandler,
);
