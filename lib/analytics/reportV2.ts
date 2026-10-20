import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsReportPeriod = "24h" | "7d" | "14d";

export type AnalyticsReportV2 = {
  version: 2;
  period: { from: string; to: string; timezone: "UTC" };
  audience: { unique_visitors: number; sessions: number; page_views: number; events: number; average_session_duration_seconds: number | null; bounce_rate: number | null };
  engagement: { content_opened: number; content_completed: number; completion_rate: number | null };
  studio: { opened: number; projects_created: number; successful_exports: number; failed_exports: number; successful_recordings: number; failed_recordings: number };
  pages: Array<{ page: string; title: string; views: number; visitors: number }>;
  content: Array<{ key: string; title: string; section: string; opens: number; completions: number; completion_rate: number | null }>;
  sections: Record<string, number>;
  languages: Record<string, number>;
  event_counts: Record<string, number>;
  data_quality: { status: "data ok" | "data incomplete"; truncated: boolean; events_without_session_id: number; events_without_user_id: number; events_without_event_id: number; missing_expected_events?: string[]; skipped_events_observable: false; note: string };
};

const PERIOD_MS: Record<AnalyticsReportPeriod, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
};

export function analyticsReportRange(period: AnalyticsReportPeriod, now = new Date()) {
  return { start: new Date(now.getTime() - PERIOD_MS[period]), end: new Date(now) };
}

export async function loadAnalyticsReportV2(supabase: SupabaseClient, period: AnalyticsReportPeriod, now = new Date()) {
  const range = analyticsReportRange(period, now);
  const { data, error } = await supabase.rpc("analytics_report_v2", {
    p_from: range.start.toISOString(),
    p_to: range.end.toISOString(),
  });
  if (error) throw error;
  return data as AnalyticsReportV2;
}

function metric(value: number | null, suffix = "") {
  return value == null ? "data incomplete" : `${value}${suffix}`;
}

export function formatAnalyticsReportV2(report: AnalyticsReportV2, periodLabel: string) {
  const quality = report.data_quality;
  return [
    `Analytics v2 — ${periodLabel}`,
    `Период: ${report.period.from} — ${report.period.to} (UTC, rolling window)`,
    "",
    "Audience:",
    `- Unique visitors: ${report.audience.unique_visitors}`,
    `- Sessions: ${report.audience.sessions}`,
    `- Page views: ${report.audience.page_views}`,
    `- Bounce rate: ${metric(report.audience.bounce_rate, "%")}`,
    "",
    "Engagement:",
    `- Content opened: ${report.engagement.content_opened}`,
    `- Content completed: ${report.engagement.content_completed}`,
    `- Completion rate: ${metric(report.engagement.completion_rate, "%")}`,
    "",
    "Studio:",
    `- Studio opened: ${report.studio.opened}`,
    `- Projects created: ${report.studio.projects_created}`,
    `- Successful exports: ${report.studio.successful_exports}`,
    `- Failed exports: ${report.studio.failed_exports}`,
    "",
    "Data quality:",
    `- Status: ${quality.status}`,
    `- Truncated: ${quality.truncated ? "yes" : "no"}`,
    `- Missing session_id: ${quality.events_without_session_id}`,
    `- Missing visitor_id: ${quality.events_without_user_id}`,
    `- Legacy rows without event_id: ${quality.events_without_event_id}`,
    `- Events not observed in this period: ${quality.missing_expected_events?.join(", ") || "нет"}`,
    `- Skipped/invalid delivery count: data incomplete (${quality.note})`,
  ].join("\n");
}
