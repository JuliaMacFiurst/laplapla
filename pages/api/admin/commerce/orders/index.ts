import type { NextApiRequest, NextApiResponse } from "next";
import type { AdminCommerceListResponse } from "@/lib/admin/commerce";
import { resolveAdminAccess } from "@/lib/server/auth/adminAccess";
import {
  listAdminCommerceOrders,
  normalizeAdminCommerceListFilters,
} from "@/lib/server/admin/commerce";
import { withApiHandler } from "@/utils/apiHandler";

type Response = AdminCommerceListResponse | { error: string };

export async function adminCommerceOrdersHandler(req: NextApiRequest, res: NextApiResponse<Response>) {
  const access = await resolveAdminAccess(req);
  if (!access.isAdmin) {
    res.status(access.isAuthenticated ? 403 : 401).json({
      error: access.isAuthenticated ? "Forbidden" : "Unauthorized",
    });
    return;
  }

  const result = await listAdminCommerceOrders(normalizeAdminCommerceListFilters(req.query));
  res.status(200).json(result);
}

export default withApiHandler<Response>(
  {
    guard: {
      methods: ["GET"],
      limit: 60,
      windowMs: 60_000,
      keyPrefix: "admin-commerce-orders",
    },
    cacheControl: "private, no-store, max-age=0",
  },
  adminCommerceOrdersHandler,
);
