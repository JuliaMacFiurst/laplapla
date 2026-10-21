import { requireWebCommerceOrigin } from "@/lib/server/commerce/originGuard";
import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { getPayPalServerConfig } from "@/lib/server/commerce/paypal/config";
import { createPrivateLiveCheckoutCookie } from "@/lib/server/commerce/paypal/privateLiveTest";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import { withApiHandler } from "@/utils/apiHandler";

export async function privateLiveAccessHandler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireWebCommerceOrigin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!enforceSameOrigin(req, res)) return;
  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ ok: false, code: "authentication_required" });
    return;
  }
  try {
    const cookie = createPrivateLiveCheckoutCookie(getPayPalServerConfig(), access.user);
    if (!cookie) {
      res.status(404).json({ ok: false, code: "unavailable" });
      return;
    }
    res.setHeader("Set-Cookie", cookie);
    res.status(200).json({ ok: true });
  } catch {
    res.status(404).json({ ok: false, code: "unavailable" });
  }
}

export default withApiHandler({
  guard: { methods: ["POST"], limit: 10, windowMs: 60_000, keyPrefix: "private-live-checkout" },
}, privateLiveAccessHandler);
