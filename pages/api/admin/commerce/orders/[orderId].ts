import type { NextApiRequest, NextApiResponse } from "next";
import type { AdminCommerceOrderDetail } from "@/lib/admin/commerce";
import { resolveAdminAccess } from "@/lib/server/auth/adminAccess";
import { getAdminCommerceOrderDetail } from "@/lib/server/admin/commerce";
import { withApiHandler } from "@/utils/apiHandler";

type Response = AdminCommerceOrderDetail | { error: string };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function adminCommerceOrderDetailHandler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const access = await resolveAdminAccess(req);
  if (!access.isAdmin) {
    res.status(access.isAuthenticated ? 403 : 401).json({
      error: access.isAuthenticated ? "Forbidden" : "Unauthorized",
    });
    return;
  }

  const orderId = typeof req.query.orderId === "string" ? req.query.orderId : "";
  if (!UUID_PATTERN.test(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const order = await getAdminCommerceOrderDetail(orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.status(200).json(order);
}

export default withApiHandler<Response>(
  {
    guard: {
      methods: ["GET"],
      limit: 60,
      windowMs: 60_000,
      keyPrefix: "admin-commerce-order-detail",
    },
    cacheControl: "private, no-store, max-age=0",
  },
  adminCommerceOrderDetailHandler,
);
