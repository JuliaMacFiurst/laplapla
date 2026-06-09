import type { NextApiRequest, NextApiResponse } from "next";
import { buildDailyAnalyticsReport } from "@/lib/analytics/dailyReport";
import { sendDiscordAnalyticsReport } from "@/lib/monitoring/discordAnalyticsReport";

type DailyReportResponse =
  | { ok: true; status: "sent" | "skipped"; events: number }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DailyReportResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const report = await buildDailyAnalyticsReport();
    const result = await sendDiscordAnalyticsReport({
      title: report.title,
      content: report.content,
    });

    if (!result.ok) {
      console.error(JSON.stringify({
        level: "error",
        message: "Daily analytics report delivery failed",
        status: result.status,
        error: result.error,
      }));
      res.status(502).json({ error: result.error });
      return;
    }

    res.status(200).json({ ok: true, status: result.status, events: report.rows.length });
  } catch (error) {
    console.error("[analytics] daily report failed", error);
    res.status(500).json({ error: "Daily report failed" });
  }
}
