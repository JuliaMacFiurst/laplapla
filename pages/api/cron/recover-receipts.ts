import type { NextApiRequest, NextApiResponse } from "next";
import { recoverMissingPaidOrderReceipts, type ReceiptRecoverySummary } from "@/lib/server/commerce/receipts/recovery";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";

type Response = ({ ok: true } & ReceiptRecoverySummary) | { ok: false; error: string };

export async function recoverReceiptsHandler(req: NextApiRequest, res: NextApiResponse<Response>) {
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
    res.status(200).json({ ok: true, ...await recoverMissingPaidOrderReceipts() });
  } catch (error) {
    await captureAndAlertServerError(error, {
      route: "/api/cron/recover-receipts",
      method: "GET",
      runtime: "server",
      statusCode: 503,
    });
    res.status(503).json({ ok: false, error: "Receipt recovery unavailable" });
  }
}

export default recoverReceiptsHandler;
