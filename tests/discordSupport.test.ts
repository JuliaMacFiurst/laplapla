import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendDiscordSupportNotification } from "@/lib/monitoring/discordSupport";
import type { SupportCategory } from "@/lib/support/types";

const input = {
  kind: "created" as const,
  id: "11111111-1111-4111-8111-111111111111",
  category: "refund" as SupportCategory,
  orderId: "22222222-2222-4222-8222-222222222222",
  locale: "he" as const,
  createdAt: "2026-10-13T10:00:00Z",
  status: "new",
  notificationStatus: "pending",
};

describe("Discord customer support payload", () => {
  beforeEach(() => vi.stubEnv("DISCORD_SUPPORT_WEBHOOK_URL", "https://discord.invalid/support"));
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it.each([
    ["refund", "🚨 LAPLAPLA | REFUND REQUEST"],
    ["payment", "🚨 LAPLAPLA | PAYMENT / ACCESS PROBLEM"],
    ["technical", "🛠 LAPLAPLA | TECHNICAL SUPPORT"],
    ["question", "💬 LAPLAPLA | PRODUCT QUESTION"],
    ["other", "📩 LAPLAPLA | CUSTOMER SUPPORT"],
  ] as const)("formats %s without customer data", async (category, title) => {
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "discord-message-1" }) });
    vi.stubGlobal("fetch", send);
    const withForbiddenFields = { ...input, category, email: "buyer@example.com",
      message: "Please refund participant name", orderReference: "secret-token" };
    expect(await sendDiscordSupportNotification(withForbiddenFields)).toEqual({ ok: true, status: "sent" });
    const [url, options] = send.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.invalid/support?wait=true");
    const body = JSON.parse(options.body as string);
    expect(body.embeds[0].title).toBe(title);
    expect(body.embeds[0].fields).toEqual(expect.arrayContaining([
      { name: "Category", value: category, inline: true },
      { name: "Request ID", value: input.id, inline: false },
      { name: "Verified order ID", value: input.orderId, inline: false },
      { name: "Language", value: "he", inline: true },
      { name: "Status", value: "new", inline: true },
    ]));
    expect(body.allowed_mentions).toEqual({ parse: [] });
    expect(JSON.stringify(body)).not.toMatch(/buyer@example\.com|Please refund|participant name|secret-token/iu);
  });

  it("omits an unverified customer order reference and sends a distinct review warning", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "discord-message-1" }) });
    vi.stubGlobal("fetch", send);
    await sendDiscordSupportNotification({ ...input, kind: "review", orderId: null, notificationStatus: "uncertain" });
    const body = JSON.parse((send.mock.calls[0][1] as RequestInit).body as string);
    expect(body.embeds[0].title).toBe("⚠️ LAPLAPLA | SUPPORT NOTIFICATION NEEDS REVIEW");
    expect(body.embeds[0].fields).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "Verified order ID" })]));
    expect(body.embeds[0].fields).toContainEqual({ name: "Email notification", value: "uncertain", inline: true });
  });

  it("returns a safe failure without exposing a webhook secret", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    expect(await sendDiscordSupportNotification(input)).toEqual({ ok: false, status: "failed", code: "http_503" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret in network error")));
    expect(await sendDiscordSupportNotification(input)).toEqual({ ok: false, status: "uncertain", code: "network_error" });
  });
});
