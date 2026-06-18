import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type CleanupAnalyticsResponse =
  | { ok: true; deletedEvents: number; refreshedSummaryDays: number }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupAnalyticsResponse>,
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
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { data: summaryData, error: summaryError } = await supabase.rpc("refresh_analytics_daily_summary", {
      p_from: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      p_to: new Date().toISOString().slice(0, 10),
    });

    if (summaryError) {
      throw summaryError;
    }

    const { data, error } = await supabase.rpc("cleanup_analytics_events", {
      p_retention: "15 days",
    });

    if (error) {
      throw error;
    }

    const firstRow = Array.isArray(data) ? data[0] : null;
    const firstSummaryRow = Array.isArray(summaryData) ? summaryData[0] : null;
    const deletedEvents = Number(firstRow?.deleted_events || 0);
    const refreshedSummaryDays = Number(firstSummaryRow?.refreshed_days || 0);

    res.status(200).json({
      ok: true,
      deletedEvents: Number.isFinite(deletedEvents) ? deletedEvents : 0,
      refreshedSummaryDays: Number.isFinite(refreshedSummaryDays) ? refreshedSummaryDays : 0,
    });
  } catch (error) {
    console.error("[analytics] cleanup failed", error);
    res.status(500).json({ error: "Analytics cleanup failed" });
  }
}
