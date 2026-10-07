import type { NextApiRequest, NextApiResponse } from "next";
import { recoverPurchaseNotifications } from "@/lib/server/commerce/purchaseNotifications";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";

export async function recoverPurchaseNotificationsHandler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  try {
    res.status(200).json({ ok: true, ...await recoverPurchaseNotifications() });
  } catch (error) {
    try {
      await captureAndAlertServerError(error, {
        route: "/api/cron/recover-purchase-notifications",
        method: "GET",
        runtime: "server",
        statusCode: 503,
      });
    } catch {
      // Keep the protected recovery endpoint deterministic if alerting is unavailable.
    }
    res.status(503).json({ ok: false, error: "Purchase notification recovery unavailable" });
  }
}

export default recoverPurchaseNotificationsHandler;
