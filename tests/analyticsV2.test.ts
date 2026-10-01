import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  deliverPayload,
  getAnalyticsSkipReason,
  resolveAnalyticsSession,
  resolveAnalyticsVisitor,
  SESSION_INACTIVITY_MS,
} from "../lib/analytics/client";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventInput } from "../lib/analytics/events";
import { analyticsNavigationKey, isNewAnalyticsNavigation } from "../lib/analytics/pageView";
import { analyticsReportRange, formatAnalyticsReportV2, type AnalyticsReportV2 } from "../lib/analytics/reportV2";
import { getServerAnalyticsSkipReason } from "../lib/analytics/serverPolicy";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const productionRequest = {
  nodeEnv: "production",
  vercelEnv: "production",
  host: "laplapla.com",
  origin: "https://laplapla.com",
  referer: "https://laplapla.com/cats",
};

describe("Analytics v2 isolation", () => {
  it("skips development, localhost, preview and technical routes on the client", () => {
    expect(getAnalyticsSkipReason({ nodeEnv: "development", hostname: "laplapla.com", pathname: "/" })).toBe("non_production_build");
    expect(getAnalyticsSkipReason({ nodeEnv: "production", hostname: "localhost", pathname: "/" })).toBe("local_host");
    expect(getAnalyticsSkipReason({ nodeEnv: "production", vercelEnv: "preview", hostname: "preview.vercel.app", pathname: "/" })).toBe("vercel_preview");
    expect(getAnalyticsSkipReason({ nodeEnv: "production", hostname: "preview.vercel.app", pathname: "/" })).toBe("vercel_preview_host");
    expect(getAnalyticsSkipReason({ nodeEnv: "production", hostname: "laplapla.com", pathname: "/", automated: true })).toBe("automated_browser");
    expect(getAnalyticsSkipReason({ nodeEnv: "production", hostname: "laplapla.com", pathname: "/internal/quest-print-lab" })).toBe("technical_route");
    expect(getAnalyticsSkipReason({ nodeEnv: "production", hostname: "laplapla.com", pathname: "/admin/analytics" })).toBe("technical_route");
  });

  it("accepts a production request and independently rejects preview/internal traffic on the server", () => {
    expect(getServerAnalyticsSkipReason(productionRequest)).toBeNull();
    expect(getServerAnalyticsSkipReason({ ...productionRequest, vercelEnv: "preview" })).toBe("vercel_preview");
    expect(getServerAnalyticsSkipReason({ ...productionRequest, referer: "https://laplapla.com/internal/quest-print-lab" })).toBe("technical_route");
    expect(getServerAnalyticsSkipReason({ ...productionRequest, userAgent: "Mozilla/5.0 HeadlessChrome/140" })).toBe("automated_browser");
  });
});

describe("Analytics v2 identity and delivery", () => {
  it("persists the anonymous visitor in local storage", () => {
    const storage = new MemoryStorage();
    expect(resolveAnalyticsVisitor(storage, () => "visitor-a")).toBe("visitor-a");
    expect(resolveAnalyticsVisitor(storage, () => "visitor-b")).toBe("visitor-a");
  });

  it("reuses a session inside 30 minutes and rotates it after inactivity", () => {
    const storage = new MemoryStorage();
    const first = resolveAnalyticsSession(storage, 1_000, () => "session-a");
    const active = resolveAnalyticsSession(storage, 1_000 + SESSION_INACTIVITY_MS, () => "session-b");
    const rotated = resolveAnalyticsSession(storage, 1_001 + SESSION_INACTIVITY_MS * 2, () => "session-b");
    expect(first).toEqual({ id: "session-a", isNew: true });
    expect(active).toEqual({ id: "session-a", isNew: false });
    expect(rotated).toEqual({ id: "session-b", isNew: true });
  });

  it("keeps event_id unchanged when the same logical event is retried", async () => {
    const payload: AnalyticsEventInput = { eventId: "11111111-1111-4111-8111-111111111111", eventName: "page_view" };
    const bodies: string[] = [];
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ ok: true, status: "duplicate" }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    await deliverPayload(payload, request as typeof fetch);
    await deliverPayload(payload, request as typeof fetch);
    expect(bodies).toHaveLength(2);
    expect(JSON.parse(bodies[0]).eventId).toBe(JSON.parse(bodies[1]).eventId);
  });
});

describe("Analytics v2 navigation and report contract", () => {
  it("counts A → B → A as three visits but a rerender of A only once", () => {
    let previous: string | null = null;
    const decisions = ["/a", "/a", "/b", "/a"].map((path) => {
      const next = analyticsNavigationKey(path, "en");
      const track = isNewAnalyticsNavigation(previous, next);
      previous = next;
      return track;
    });
    expect(decisions).toEqual([true, false, true, true]);
  });

  it("defines exact rolling 24h, 7d and 14d periods", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    expect(analyticsReportRange("24h", now).start.toISOString()).toBe("2026-09-29T12:00:00.000Z");
    expect(analyticsReportRange("7d", now).start.toISOString()).toBe("2026-09-23T12:00:00.000Z");
    expect(analyticsReportRange("14d", now).start.toISOString()).toBe("2026-09-16T12:00:00.000Z");
  });

  it("uses the same report metrics in the copied report formatter", () => {
    const report = {
      version: 2,
      period: { from: "2026-09-23T12:00:00.000Z", to: "2026-09-30T12:00:00.000Z", timezone: "UTC" },
      audience: { unique_visitors: 4, sessions: 5, page_views: 9, events: 20, average_session_duration_seconds: 30, bounce_rate: 40 },
      engagement: { content_opened: 3, content_completed: 2, completion_rate: 66.7 },
      studio: { opened: 2, projects_created: 1, successful_exports: 1, failed_exports: 0, successful_recordings: 0, failed_recordings: 0 },
      pages: [], content: [], sections: {}, languages: {}, event_counts: {},
      data_quality: { status: "data ok", truncated: false, events_without_session_id: 0, events_without_user_id: 0, events_without_event_id: 0, skipped_events_observable: false, note: "not stored" },
    } satisfies AnalyticsReportV2;
    const copied = formatAnalyticsReportV2(report, "Last 7 days");
    expect(copied).toContain("Unique visitors: 4");
    expect(copied).toContain("Sessions: 5");
    expect(copied).toContain("Page views: 9");
    expect(copied).toContain("Content completed: 2");
    expect(copied).toContain("Successful exports: 1");
  });

  it("keeps TypeScript taxonomy aligned with the database and bounds completion by matched opens", async () => {
    const sql = await readFile(new URL("../supabase/migrations/202609300004_add_preorder_analytics_events.sql", import.meta.url), "utf8");
    const constraint = sql.match(/analytics_events_event_name_check check \(event_name in \(([\s\S]*?)\n\s*\)\);/)?.[1] || "";
    const sqlNames = Array.from(constraint.matchAll(/'([^']+)'/g), (match) => match[1]);
    expect(new Set(sqlNames)).toEqual(new Set(ANALYTICS_EVENT_NAMES));
    const foundationSql = await readFile(new URL("../supabase/migrations/202609300001_analytics_v2_foundation.sql", import.meta.url), "utf8");
    expect(foundationSql).toContain("left join content_completes c using (attempt_key)");
    expect(foundationSql).toContain("count(c.attempt_key)::integer as completions");
    expect(foundationSql).toContain("content_open_events as");
    expect(foundationSql).toContain("canonical.event_name = 'content_open'");
    expect(foundationSql).toContain("analytics_events_event_id_key unique (event_id)");
  });
});
