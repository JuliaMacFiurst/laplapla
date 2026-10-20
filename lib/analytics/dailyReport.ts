import { createServerSupabaseClient } from "@/lib/server/supabase";
import {
  formatAnalyticsReportV2,
  loadAnalyticsReportV2,
  type AnalyticsReportPeriod,
} from "@/lib/analytics/reportV2";

async function build(period: AnalyticsReportPeriod, title: string, label: string, now = new Date()) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const report = await loadAnalyticsReportV2(supabase, period, now);
  return {
    title,
    content: formatAnalyticsReportV2(report, label),
    events: report.audience.events,
    report,
  };
}

export function buildDailyAnalyticsReport(now = new Date()) {
  return build("24h", "LapLapLa Analytics — Last 24 hours", "Last 24 hours", now);
}

export function buildWeeklyAnalyticsReport(now = new Date()) {
  return build("7d", "LapLapLa Analytics — Last 7 days", "Last 7 days", now);
}
