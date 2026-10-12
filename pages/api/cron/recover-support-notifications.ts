import type { NextApiRequest, NextApiResponse } from "next";
import { recoverSupportNotifications } from "@/lib/server/customerSupport";
import { recoverSupportDiscordReviewWarnings } from "@/lib/server/supportDiscord";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false });
    return;
  }
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ ok: false });
    return;
  }
  try {
    const summary = await recoverSupportNotifications();
    let discordReview = { scanned: 0, sent: 0, failed: 0 };
    try {
      discordReview = await recoverSupportDiscordReviewWarnings();
    } catch {
      console.warn("[customer-support] Discord review warning scan failed");
    }
    if (summary.manualReview > 0 || summary.pendingRemaining > 0 || summary.inFlight > 0) {
      console.warn("[customer-support] notification attention required", {
        manualReview: summary.manualReview,
        pendingRemaining: summary.pendingRemaining,
        inFlight: summary.inFlight,
      });
    }
    res.status(200).json({ ok: true, ...summary, discordReview });
  } catch {
    res.status(503).json({ ok: false });
  }
}
