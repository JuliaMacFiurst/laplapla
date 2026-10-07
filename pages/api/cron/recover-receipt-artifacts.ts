import type { NextApiRequest, NextApiResponse } from "next";
import { recoverReceiptArtifacts, type ReceiptArtifactRecoverySummary } from "@/lib/server/commerce/receipts/artifactRecovery";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";

type Response = ({ ok: true } & ReceiptArtifactRecoverySummary) | { ok: false; error: string };

export async function recoverReceiptArtifactsHandler(req: NextApiRequest, res: NextApiResponse<Response>) {
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
    res.status(200).json({ ok: true, ...await recoverReceiptArtifacts() });
  } catch (error) {
    await captureAndAlertServerError(error, {
      route: "/api/cron/recover-receipt-artifacts", method: "GET", runtime: "server", statusCode: 503,
    });
    res.status(503).json({ ok: false, error: "Receipt artifact recovery unavailable" });
  }
}

export default recoverReceiptArtifactsHandler;
