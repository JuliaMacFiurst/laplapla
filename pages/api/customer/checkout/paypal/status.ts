import { requireWebCommerceOrigin } from "@/lib/server/commerce/originGuard";
import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { getPurchaseSuccessState, type PurchaseSuccessState } from "@/lib/server/commerce/purchaseSuccess";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type PurchaseStatusResponse =
  | { ok: true; status: PurchaseSuccessState }
  | { ok: false; code: "invalid_request" | "authentication_required" | "order_not_found" | "verification_failed" };

export default async function handler(req: NextApiRequest, res: NextApiResponse<PurchaseStatusResponse>) {
  if (!requireWebCommerceOrigin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, code: "invalid_request" });
    return;
  }

  const orderId = req.query.orderId;
  if (typeof orderId !== "string" || !UUID_PATTERN.test(orderId)) {
    res.status(400).json({ ok: false, code: "invalid_request" });
    return;
  }
  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ ok: false, code: "authentication_required" });
    return;
  }

  try {
    const status = await getPurchaseSuccessState(orderId, access.user.id, access.accessToken);
    if (!status) {
      res.status(404).json({ ok: false, code: "order_not_found" });
      return;
    }
    res.status(200).json({ ok: true, status });
  } catch {
    res.status(500).json({ ok: false, code: "verification_failed" });
  }
}
