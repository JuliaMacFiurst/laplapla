import type { NextApiRequest, NextApiResponse } from "next";
import { getProductById } from "@/lib/shop/catalog";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { customerHasActiveProductEntitlement } from "@/lib/server/customerEntitlements";

function getProductId(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const productId = getProductId(req.query.productId);
  if (!productId || !getProductById(productId)) {
    res.status(400).json({ error: "Unknown product" });
    return;
  }

  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ access: false, reason: "authentication_required" });
    return;
  }

  try {
    const hasAccess = await customerHasActiveProductEntitlement(
      access.accessToken,
      access.user.id,
      productId,
    );
    res.status(hasAccess ? 200 : 403).json({
      access: hasAccess,
      reason: hasAccess ? null : "entitlement_required",
    });
  } catch (error) {
    console.error("[customer-product-access] failed to verify entitlement", error);
    res.status(500).json({ access: false, reason: "verification_failed" });
  }
}
