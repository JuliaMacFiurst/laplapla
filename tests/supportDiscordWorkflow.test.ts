import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: mocks.db }));
vi.mock("@/lib/monitoring/discordSupport", () => ({ sendDiscordSupportNotification: mocks.send }));

import {
  notifySupportDiscordCreated, notifySupportDiscordReview, recoverSupportDiscordReviewWarnings,
} from "@/lib/server/supportDiscord";

type Row = {
  id: string;
  category: string;
  order_id: string | null;
  locale: string;
  created_at: string;
  status: string;
  notification_status: string;
  notification_attempts: number;
  notification_error_code: string | null;
  discord_created_claimed_at: string | null;
  discord_created_delivery_status: string | null;
  discord_review_claimed_at: string | null;
  discord_review_delivery_status: string | null;
};

function row(id: string, notificationStatus = "pending"): Row {
  return {
    id, category: "refund", order_id: null, locale: "ru", created_at: "2026-10-13T09:00:00Z",
    status: "new", notification_status: notificationStatus, notification_attempts: notificationStatus === "pending" ? 0 : 1,
    notification_error_code: null,
    discord_created_claimed_at: null, discord_created_delivery_status: null,
    discord_review_claimed_at: null, discord_review_delivery_status: null,
  };
}

function database(rows: Row[]) {
  class Query {
    private filters: Array<(row: Row) => boolean> = [];
    private changes: Partial<Row> | null = null;
    private maximum: number | null = null;
    update(changes: Partial<Row>) { this.changes = changes; return this; }
    select(_fields: string) { return this; }
    eq(field: keyof Row, value: unknown) { this.filters.push((item) => item[field] === value); return this; }
    is(field: keyof Row, value: null) { this.filters.push((item) => item[field] === value); return this; }
    in(field: keyof Row, values: unknown[]) { this.filters.push((item) => values.includes(item[field])); return this; }
    gt(field: keyof Row, value: number) { this.filters.push((item) => typeof item[field] === "number" && item[field] > value); return this; }
    order() { return this; }
    limit(maximum: number) { this.maximum = maximum; return this; }
    private execute() {
      let matched = rows.filter((item) => this.filters.every((filter) => filter(item)));
      if (this.maximum !== null) matched = matched.slice(0, this.maximum);
      if (this.changes) matched.forEach((item) => Object.assign(item, this.changes));
      return { data: matched.map((item) => ({ ...item })), error: null };
    }
    async maybeSingle() { const result = this.execute(); return { data: result.data[0] ?? null, error: null }; }
    then<T>(resolve: (value: ReturnType<Query["execute"]>) => T) { return Promise.resolve(this.execute()).then(resolve); }
  }
  mocks.db.mockReturnValue({ from: (table: string) => {
    expect(table).toBe("customer_support_requests");
    return new Query();
  } });
}

describe("durable support Discord claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({ ok: true, status: "sent" });
  });

  it("sends a newly saved ticket only once across repeat calls", async () => {
    const saved = row("ticket-1");
    database([saved]);
    expect(await notifySupportDiscordCreated(saved.id)).toBe("sent");
    expect(await notifySupportDiscordCreated(saved.id)).toBe("skipped");
    expect(saved.discord_created_delivery_status).toBe("sent");
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ kind: "created", id: saved.id, orderId: null }));
  });

  it("records a Discord failure without trying again automatically", async () => {
    const saved = row("ticket-1");
    database([saved]);
    mocks.send.mockResolvedValue({ ok: false, status: "uncertain", code: "network_error" });
    expect(await notifySupportDiscordCreated(saved.id)).toBe("failed");
    expect(saved.discord_created_delivery_status).toBe("uncertain");
    expect(await notifySupportDiscordCreated(saved.id)).toBe("skipped");
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("alerts on failed and uncertain Resend outcomes once across cron runs", async () => {
    const failed = row("ticket-failed", "failed");
    const uncertain = row("ticket-uncertain", "uncertain");
    database([failed, uncertain]);
    expect(await recoverSupportDiscordReviewWarnings()).toEqual({ scanned: 2, sent: 2, failed: 0 });
    expect(await recoverSupportDiscordReviewWarnings()).toEqual({ scanned: 0, sent: 0, failed: 0 });
    expect(failed.discord_review_delivery_status).toBe("sent");
    expect(uncertain.discord_review_delivery_status).toBe("sent");
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("does not duplicate a warning when the API and cron race", async () => {
    const saved = row("ticket-1", "failed");
    database([saved]);
    await Promise.all([notifySupportDiscordReview(saved.id), recoverSupportDiscordReviewWarnings()]);
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(saved.discord_review_claimed_at).not.toBeNull();
  });

  it("keeps a failed Discord warning claimed on the next cron run", async () => {
    const saved = row("ticket-1", "failed");
    database([saved]);
    mocks.send.mockResolvedValue({ ok: false, status: "failed", code: "http_503" });
    expect(await recoverSupportDiscordReviewWarnings()).toEqual({ scanned: 1, sent: 0, failed: 1 });
    expect(await recoverSupportDiscordReviewWarnings()).toEqual({ scanned: 0, sent: 0, failed: 0 });
    expect(saved.discord_review_delivery_status).toBe("failed");
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("warns once when Resend is unconfigured but the request remains safely pending", async () => {
    const saved = row("ticket-1");
    saved.notification_error_code = "provider_not_configured";
    database([saved]);
    expect(await recoverSupportDiscordReviewWarnings()).toEqual({ scanned: 1, sent: 1, failed: 0 });
    expect(await recoverSupportDiscordReviewWarnings()).toEqual({ scanned: 0, sent: 0, failed: 0 });
    expect(mocks.send).toHaveBeenCalledOnce();
  });
});
