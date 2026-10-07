import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendDiscordPurchaseNotification } from "@/lib/monitoring/discordPurchase";

const input = {
  notificationId: "notification-1",
  orderId: "order-1",
  product: "Sound Case #001 - LapLapLa",
  amountMinor: 4900,
  currency: "ILS",
  provider: "paypal",
  paidAt: "2026-10-07T12:00:00.000Z",
  priceSource: "catalog",
};

describe("Discord purchase delivery", () => {
  beforeEach(() => { vi.restoreAllMocks(); delete process.env.DISCORD_PURCHASES_WEBHOOK_URL; });
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.DISCORD_PURCHASES_WEBHOOK_URL; });

  it("skips safely when the dedicated webhook is not configured", async () => {
    await expect(sendDiscordPurchaseNotification(input)).resolves.toEqual({
      ok: false, status: "not-configured", code: "missing_webhook",
    });
  });

  it("uses only the dedicated server-side webhook and sends no customer PII", async () => {
    process.env.DISCORD_PURCHASES_WEBHOOK_URL = "https://discord.invalid/purchases";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "message-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendDiscordPurchaseNotification(input)).resolves.toEqual({
      ok: true, status: "sent", messageId: "message-1",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://discord.invalid/purchases?wait=true", expect.any(Object));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(JSON.stringify(payload)).toContain("Sound Case #001 - LapLapLa");
    expect(JSON.stringify(payload)).toContain("49.00");
    expect(JSON.stringify(payload)).not.toMatch(/customer|email|billing|payer|address/iu);
  });

  it("normalizes network and non-2xx failures without exposing the webhook", async () => {
    process.env.DISCORD_PURCHASES_WEBHOOK_URL = "https://discord.invalid/purchases-secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }));
    await expect(sendDiscordPurchaseNotification(input)).resolves.toEqual({
      ok: false, status: "discord-error", code: "http_503",
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network with secret")));
    await expect(sendDiscordPurchaseNotification(input)).resolves.toEqual({
      ok: false, status: "discord-error", code: "network_error",
    });
  });
});
