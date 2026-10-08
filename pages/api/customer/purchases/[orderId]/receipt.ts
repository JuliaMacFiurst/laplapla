import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { downloadOwnReceiptOriginal } from "@/lib/server/customerPurchases";
import { withApiHandler } from "@/utils/apiHandler";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function customerReceiptDownloadHandler(req: NextApiRequest, res: NextApiResponse) {
  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) { res.status(401).json({ error: "Authentication required" }); return; }
  const orderId = typeof req.query.orderId === "string" ? req.query.orderId : "";
  if (!UUID.test(orderId)) { res.status(400).json({ error: "Invalid order ID" }); return; }
  const result = await downloadOwnReceiptOriginal(access.user.id, orderId);
  if (result.status !== "ready") {
    res.status(result.status === "not_found" ? 404 : 409).json({ error: result.status === "not_found" ? "Receipt not found" : "Receipt is not ready" });
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.setHeader("Content-Length", String(result.bytes.byteLength));
  res.status(200).send(result.bytes);
}

export default withApiHandler({ guard: { methods: ["GET"], limit: 20, windowMs: 60_000, keyPrefix: "customer-receipt-download" }, cacheControl: "private, no-store, max-age=0" }, customerReceiptDownloadHandler);
