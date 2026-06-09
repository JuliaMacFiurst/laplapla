import { ANALYTICS_EVENT_LABELS, type AnalyticsEventName } from "@/lib/analytics/events";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type AnalyticsEventRow = {
  event_name: AnalyticsEventName;
  entity_type: string | null;
  entity_id: string | null;
  entity_title: string | null;
  page: string | null;
  lang: string | null;
  visitor_id: string | null;
  session_id: string | null;
  created_at: string;
};

type DateRange = {
  start: Date;
  end: Date;
};

const EVENT_ORDER: AnalyticsEventName[] = [
  "story_opened",
  "story_completed",
  "recipe_opened",
  "map_opened",
  "project_created",
  "video_exported",
  "short_opened",
  "story_downloaded",
  "page_viewed",
];

const LANG_LABELS: Record<string, string> = {
  en: "English",
  ru: "Russian",
  he: "Hebrew",
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getYesterdayUtcRange(now = new Date()): DateRange {
  const today = startOfUtcDay(now);
  return {
    start: addDays(today, -1),
    end: today,
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatDateRange(range: DateRange) {
  return `${formatDate(range.start)} - ${formatDate(addDays(range.end, -1))}`;
}

function countBy<T extends string>(rows: AnalyticsEventRow[], getKey: (row: AnalyticsEventRow) => T | null | undefined) {
  const counts = new Map<T, number>();
  rows.forEach((row) => {
    const key = getKey(row);
    if (!key) {
      return;
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function uniqueCount(rows: AnalyticsEventRow[], getKey: (row: AnalyticsEventRow) => string | null | undefined) {
  const values = new Set<string>();
  rows.forEach((row) => {
    const key = getKey(row);
    if (key) {
      values.add(key);
    }
  });
  return values.size;
}

function topEntries<T extends string>(counts: Map<T, number>, limit: number) {
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function formatDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return "same";
  }

  if (previous === 0) {
    return "new";
  }

  const delta = ((current - previous) / previous) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Math.round(delta)}%`;
}

function formatRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "n/a";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatTopList(entries: Array<[string, number]>, emptyText: string) {
  if (entries.length === 0) {
    return `- ${emptyText}`;
  }

  return entries.map(([label, count], index) => `${index + 1}. ${label} - ${count}`).join("\n");
}

function getContentKey(row: AnalyticsEventRow) {
  if (!row.entity_type || !row.entity_id) {
    return null;
  }

  const title = row.entity_title || row.entity_id;
  return `${title} (${row.entity_type})`;
}

function getPeakHour(rows: AnalyticsEventRow[]) {
  const hourlyCounts = countBy(rows, (row) => {
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return `${String(date.getUTCHours()).padStart(2, "0")}:00 UTC`;
  });

  return topEntries(hourlyCounts, 1)[0] || null;
}

async function loadAnalyticsRows(range: DateRange, limit = 10000) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_name, entity_type, entity_id, entity_title, page, lang, visitor_id, session_id, created_at")
    .gte("created_at", range.start.toISOString())
    .lt("created_at", range.end.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []) as AnalyticsEventRow[];
}

function buildReportContent(params: {
  reportName: string;
  range: DateRange;
  rows: AnalyticsEventRow[];
  previousRows: AnalyticsEventRow[];
  contextRows: AnalyticsEventRow[];
  dateLabel: string;
  comparisonLabel: string;
  contextLabel: string;
}) {
  const { reportName, rows, previousRows, contextRows, dateLabel, comparisonLabel, contextLabel } = params;
  const eventCounts = countBy(rows, (row) => row.event_name);
  const previousEventCounts = countBy(previousRows, (row) => row.event_name);
  const visitors = uniqueCount(rows, (row) => row.visitor_id);
  const previousVisitors = uniqueCount(previousRows, (row) => row.visitor_id);
  const sessions = uniqueCount(rows, (row) => row.session_id);
  const previousSessions = uniqueCount(previousRows, (row) => row.session_id);
  const contextVisitors = uniqueCount(contextRows, (row) => row.visitor_id);
  const contextSessions = uniqueCount(contextRows, (row) => row.session_id);
  const storiesOpened = eventCounts.get("story_opened") || 0;
  const storiesCompleted = eventCounts.get("story_completed") || 0;
  const previousStoriesOpened = previousEventCounts.get("story_opened") || 0;
  const previousStoriesCompleted = previousEventCounts.get("story_completed") || 0;
  const peakHour = getPeakHour(rows);
  const topContent = topEntries(countBy(rows, getContentKey), 8);
  const topStories = topEntries(
    countBy(rows.filter((row) => row.entity_type === "story" || row.entity_type === "book"), getContentKey),
    5,
  );
  const topRecipes = topEntries(countBy(rows.filter((row) => row.entity_type === "recipe"), getContentKey), 5);
  const topMaps = topEntries(countBy(rows.filter((row) => row.entity_type === "map"), getContentKey), 5);
  const topLanguages = topEntries(countBy(rows, (row) => row.lang ? LANG_LABELS[row.lang] || row.lang : null), 5);
  const topPages = topEntries(countBy(rows, (row) => row.page || null), 8);
  const topEventTypes = EVENT_ORDER
    .map((eventName) => ({
      eventName,
      current: eventCounts.get(eventName) || 0,
      previous: previousEventCounts.get(eventName) || 0,
    }))
    .filter((item) => item.current > 0 || item.previous > 0);

  const lines = [
    reportName,
    "",
    `${dateLabel} (UTC)`,
    "",
    "Audience",
    `- Visitors: ${visitors} (${formatDelta(visitors, previousVisitors)} vs ${comparisonLabel})`,
    `- Sessions: ${sessions} (${formatDelta(sessions, previousSessions)} vs ${comparisonLabel})`,
    `- Events: ${rows.length} (${formatDelta(rows.length, previousRows.length)} vs ${comparisonLabel})`,
    `- Peak hour: ${peakHour ? `${peakHour[0]} - ${peakHour[1]} events` : "n/a"}`,
    "",
    "Story Completion",
    `- Completion rate: ${formatRate(storiesCompleted, storiesOpened)}`,
    `- Stories opened: ${storiesOpened} (${formatDelta(storiesOpened, previousStoriesOpened)})`,
    `- Stories completed: ${storiesCompleted} (${formatDelta(storiesCompleted, previousStoriesCompleted)})`,
    "",
    "Key Events",
    ...(topEventTypes.length > 0
      ? topEventTypes.map((item) => (
        `- ${ANALYTICS_EVENT_LABELS[item.eventName]}: ${item.current} (${formatDelta(item.current, item.previous)})`
      ))
      : ["- No tracked events yesterday"]),
    "",
    "Top Content",
    formatTopList(topContent, "No content events"),
    "",
    "Top Stories",
    formatTopList(topStories, "No story activity"),
    "",
    "Top Recipes",
    formatTopList(topRecipes, "No recipe activity"),
    "",
    "Top Maps",
    formatTopList(topMaps, "No map activity"),
    "",
    "Top Languages",
    formatTopList(topLanguages, "No language data"),
    "",
    "Top Pages",
    formatTopList(topPages, "No page data"),
    "",
    contextLabel,
    `- Visitors: ${contextVisitors}`,
    `- Sessions: ${contextSessions}`,
    `- Events: ${contextRows.length}`,
  ];

  if (rows.length === 0) {
    lines.splice(4, 0, "No analytics events were recorded yesterday. Tracking and cron can still be healthy.");
    lines.splice(5, 0, "");
  }

  return lines.join("\n");
}

async function buildAnalyticsReport(params: {
  reportName: string;
  range: DateRange;
  previousRange: DateRange;
  contextRange: DateRange;
  dateLabel: string;
  comparisonLabel: string;
  contextLabel: string;
  title: string;
}) {
  const [rows, previousRows, weeklyRows] = await Promise.all([
    loadAnalyticsRows(params.range),
    loadAnalyticsRows(params.previousRange),
    loadAnalyticsRows(params.contextRange, 50000),
  ]);

  return {
    title: params.title,
    content: buildReportContent({
      reportName: params.reportName,
      range: params.range,
      rows,
      previousRows,
      contextRows: weeklyRows,
      dateLabel: params.dateLabel,
      comparisonLabel: params.comparisonLabel,
      contextLabel: params.contextLabel,
    }),
    rows,
    previousRows,
    weeklyRows,
  };
}

export async function buildDailyAnalyticsReport(now = new Date()) {
  const range = getYesterdayUtcRange(now);
  const previousRange = {
    start: addDays(range.start, -1),
    end: range.start,
  };
  const weeklyRange = {
    start: addDays(range.end, -7),
    end: range.end,
  };

  return buildAnalyticsReport({
    reportName: "LapLapLa Daily Report",
    range,
    previousRange,
    contextRange: weeklyRange,
    dateLabel: `Date: ${formatDate(range.start)}`,
    comparisonLabel: "previous day",
    contextLabel: "7-Day Context",
    title: `LapLapLa Daily Report - ${formatDate(range.start)}`,
  });
}

export async function buildWeeklyAnalyticsReport(now = new Date()) {
  const today = startOfUtcDay(now);
  const range = {
    start: addDays(today, -7),
    end: today,
  };
  const previousRange = {
    start: addDays(range.start, -7),
    end: range.start,
  };
  const twoWeekRange = {
    start: addDays(range.end, -14),
    end: range.end,
  };

  return buildAnalyticsReport({
    reportName: "LapLapLa Weekly Report",
    range,
    previousRange,
    contextRange: twoWeekRange,
    dateLabel: `Range: ${formatDateRange(range)}`,
    comparisonLabel: "previous week",
    contextLabel: "14-Day Context",
    title: `LapLapLa Weekly Report - ${formatDateRange(range)}`,
  });
}
