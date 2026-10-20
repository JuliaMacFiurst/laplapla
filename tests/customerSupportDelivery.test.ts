import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: mockDb }));

import { formatSupportEmail, sendSupportNotification } from "@/lib/server/customerSupport";

const row = {
  id: "ticket-1", email: "buyer@example.com", category: "refund" as const,
  message: "Please review my order.", order_reference: "ORDER-1", order_id: "verified-id", product_title: "Sound Case #001",
  created_at: "2026-10-12T09:00:00Z", notification_status: "sending", notification_attempts: 0,
};

function database() {
  const updates: Record<string, unknown>[] = [];
  const query = {
    eq: () => query,
    in: () => query,
    select: () => query,
    maybeSingle: async () => ({ data: row, error: null }),
    then: (resolve: (value: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  mockDb.mockReturnValue({ from: () => ({ update: (value: Record<string, unknown>) => { updates.push(value); return query; } }) });
  return updates;
}

describe("support notification delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "LapLapLa Support <support@laplapla.com>");
    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "juliamakhlinfiurst@gmail.com");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("formats the required metadata without HTML interpolation", () => {
    const email = formatSupportEmail(row);
    expect(email.subject).toBe("🚨🚨🚨 LAPLAPLA | REFUND REQUEST | ORDER ORDER-1");
    expect(email.text).toContain("Request: ticket-1");
    expect(email.text).toContain("Customer email: buyer@example.com");
    expect(email.text).toContain("Product: Sound Case #001");
  });

  it("marks provider acceptance and uses Reply-To plus a stable idempotency key", async () => {
    const updates = database();
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
    vi.stubGlobal("fetch", send);
    expect(await sendSupportNotification("ticket-1")).toBe("accepted");
    expect(send).toHaveBeenCalledOnce();
    const [url, options] = send.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers).toMatchObject({ "Idempotency-Key": "support-request/ticket-1" });
    expect(JSON.parse(options.body as string)).toMatchObject({
      from: "LapLapLa Support <support@laplapla.com>", to: ["juliamakhlinfiurst@gmail.com"], reply_to: "buyer@example.com",
    });
    expect(updates.at(-1)).toMatchObject({ notification_status: "accepted", notification_provider_id: "email-1" });
  });

  it("retains the request and records a provider error for manual review", async () => {
    const updates = database();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await sendSupportNotification("ticket-1")).toBe("failed");
    expect(updates.at(-1)).toMatchObject({ notification_status: "failed", notification_error_code: "resend_503" });
  });

  it("does not claim delivery after an ambiguous network timeout", async () => {
    const updates = database();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await sendSupportNotification("ticket-1")).toBe("uncertain");
    expect(updates.at(-1)).toMatchObject({ notification_status: "uncertain" });
  });

  it("keeps an unsent request pending when Resend is not configured", async () => {
    const updates = database();
    vi.stubEnv("RESEND_API_KEY", "");
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    expect(await sendSupportNotification("ticket-1")).toBe("failed");
    expect(send).not.toHaveBeenCalled();
    expect(updates.at(-1)).toMatchObject({ notification_status: "pending", notification_attempts: 0, notification_error_code: "provider_not_configured" });
  });

  it("keeps the request pending when the notification recipient is missing", async () => {
    const updates = database();
    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "");
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    expect(await sendSupportNotification("ticket-1")).toBe("failed");
    expect(send).not.toHaveBeenCalled();
    expect(updates.at(-1)).toMatchObject({ notification_status: "pending", notification_attempts: 0 });
  });
});
