import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: mockDb }));

import { recoverSupportNotifications, sendSupportNotification } from "@/lib/server/customerSupport";

type Ticket = {
  id: string;
  email: string;
  category: "technical";
  message: string;
  order_reference: null;
  order_id: null;
  product_title: null;
  created_at: string;
  notification_status: string;
  notification_attempts: number;
  notification_claimed_at: string | null;
  notification_error_code?: string | null;
};

function ticket(ageHours = 1, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "ticket-1", email: "buyer@example.com", category: "technical",
    message: "The game does not open.", order_reference: null, order_id: null, product_title: null,
    created_at: new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString(),
    notification_status: "pending", notification_attempts: 0, notification_claimed_at: null,
    ...overrides,
  };
}

function database(rows: Ticket[]) {
  class Query {
    private filters: Array<(row: Ticket) => boolean> = [];
    private changes: Partial<Ticket> | null = null;
    private countOnly = false;
    private maximum: number | null = null;
    private sortOldest = false;

    update(changes: Partial<Ticket>) { this.changes = changes; return this; }
    select(_fields: string, options?: { count?: string; head?: boolean }) {
      this.countOnly = options?.head === true;
      return this;
    }
    eq(field: keyof Ticket, value: unknown) { this.filters.push((row) => row[field] === value); return this; }
    in(field: keyof Ticket, values: unknown[]) { this.filters.push((row) => values.includes(row[field])); return this; }
    lt(field: keyof Ticket, value: string) { this.filters.push((row) => typeof row[field] === "string" && row[field] < value); return this; }
    gt(field: keyof Ticket, value: number) { this.filters.push((row) => typeof row[field] === "number" && row[field] > value); return this; }
    is(field: keyof Ticket, value: null) { this.filters.push((row) => row[field] === value); return this; }
    order(_field: string, _options: { ascending: boolean }) { this.sortOldest = true; return this; }
    limit(maximum: number) { this.maximum = maximum; return this; }
    private execute() {
      let matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.sortOldest) matched = [...matched].sort((a, b) => a.created_at.localeCompare(b.created_at));
      if (this.maximum !== null) matched = matched.slice(0, this.maximum);
      if (this.changes) matched.forEach((row) => Object.assign(row, this.changes));
      return { data: this.countOnly ? null : matched.map((row) => ({ ...row })), count: this.countOnly ? matched.length : null, error: null };
    }
    async maybeSingle() {
      const result = this.execute();
      return { data: result.data?.[0] ?? null, error: null };
    }
    then<T>(resolve: (value: ReturnType<Query["execute"]>) => T) { return Promise.resolve(this.execute()).then(resolve); }
  }
  mockDb.mockReturnValue({ from: (table: string) => {
    expect(table).toBe("customer_support_requests");
    return new Query();
  } });
}

describe("support notification recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T12:00:00Z"));
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "LapLapLa Support <support@laplapla.com>");
    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "juliamakhlinfiurst@gmail.com");
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("recovers a saved request after configuration failure without a prior provider attempt", async () => {
    const row = ticket(30);
    database([row]);
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    vi.stubGlobal("fetch", send);
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendSupportNotification(row.id)).toBe("failed");
    expect(row).toMatchObject({ notification_status: "pending", notification_attempts: 0 });
    expect(send).not.toHaveBeenCalled();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const summary = await recoverSupportNotifications();
    expect(summary).toMatchObject({ accepted: 1, manualReview: 0, pendingRemaining: 0 });
    expect(row).toMatchObject({ notification_status: "accepted", notification_attempts: 1 });
    expect(send).toHaveBeenCalledOnce();
  });

  it.each([21, 25, 72])("finds a %ih old provider failure without resending it", async (ageHours) => {
    const row = ticket(ageHours, { notification_status: "failed", notification_attempts: 1, notification_error_code: "resend_503" });
    database([row]);
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    expect(await recoverSupportNotifications()).toMatchObject({ scanned: 0, manualReview: 1 });
    expect(await sendSupportNotification(row.id)).toBe("skipped");
    expect(row.notification_status).toBe("failed");
    expect(send).not.toHaveBeenCalled();
  });

  it("records a provider error once and exposes it for manual review on later cron runs", async () => {
    const row = ticket();
    database([row]);
    const send = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", send);
    expect(await sendSupportNotification(row.id)).toBe("failed");
    expect(row).toMatchObject({ notification_status: "failed", notification_attempts: 1 });
    expect(await recoverSupportNotifications()).toMatchObject({ manualReview: 1, accepted: 0 });
    expect(await recoverSupportNotifications()).toMatchObject({ manualReview: 1, accepted: 0 });
    expect(send).toHaveBeenCalledOnce();
  });

  it("never resends an uncertain outcome, including after the idempotency key expires", async () => {
    const row = ticket(26);
    database([row]);
    const send = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", send);
    expect(await sendSupportNotification(row.id)).toBe("uncertain");
    expect(row).toMatchObject({ notification_status: "uncertain", notification_attempts: 1 });
    vi.setSystemTime(new Date(Date.now() + 25 * 60 * 60 * 1000));
    expect(await recoverSupportNotifications()).toMatchObject({ manualReview: 1, scanned: 0 });
    expect(send).toHaveBeenCalledOnce();
  });

  it("moves a stale in-flight claim to manual review rather than risking a second send", async () => {
    const row = ticket(25, { notification_status: "sending", notification_attempts: 0,
      notification_claimed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() });
    database([row]);
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    expect(await recoverSupportNotifications()).toMatchObject({ manualReview: 1, scanned: 0 });
    expect(row.notification_status).toBe("uncertain");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not duplicate an accepted email on repeated or overlapping cron runs", async () => {
    const row = ticket(25);
    database([row]);
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    vi.stubGlobal("fetch", send);
    await Promise.all([recoverSupportNotifications(), recoverSupportNotifications()]);
    expect(row).toMatchObject({ notification_status: "accepted", notification_attempts: 1 });
    expect(await recoverSupportNotifications()).toMatchObject({ scanned: 0, manualReview: 0 });
    expect(send).toHaveBeenCalledOnce();
  });

  it("flags a pending row with a previous attempt rather than retrying it", async () => {
    const row = ticket(30, { notification_attempts: 1 });
    database([row]);
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    expect(await recoverSupportNotifications()).toMatchObject({ scanned: 0, manualReview: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it("reports every unsent request left after the bounded Hobby cron batch", async () => {
    const rows = Array.from({ length: 6 }, (_, index) => ticket(30 - index, { id: `ticket-${index}` }));
    database(rows);
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    vi.stubGlobal("fetch", send);
    expect(await recoverSupportNotifications()).toMatchObject({ scanned: 4, accepted: 4, pendingRemaining: 2 });
    expect(send).toHaveBeenCalledTimes(4);
    expect(rows.filter((row) => row.notification_status === "pending")).toHaveLength(2);
  });
});
