import type { NextApiRequest, NextApiResponse } from "next";
import { getPayPalPublicConfig } from "@/lib/server/commerce/paypal/config";
import type { PayPalPublicConfigResponse } from "@/lib/shop/paypalCheckout";
import { withApiHandler } from "@/utils/apiHandler";

export async function paypalConfigHandler(
  _req: NextApiRequest,
  res: NextApiResponse<PayPalPublicConfigResponse>,
) {
  try {
    res.status(200).json({ ok: true, ...getPayPalPublicConfig() });
  } catch {
    res.status(503).json({ ok: false, code: "unavailable" });
  }
}

export default withApiHandler<PayPalPublicConfigResponse>(
  {
    guard: { methods: ["GET"], limit: 60, windowMs: 60_000, keyPrefix: "paypal-config" },
    cacheControl: "private, no-store, max-age=0",
  },
  paypalConfigHandler,
);
