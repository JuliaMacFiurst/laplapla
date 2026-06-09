import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDiscordAnalyticsReport } from "../lib/monitoring/discordAnalyticsReport";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Discord analytics reports", () => {
  it("skips gracefully when the analytics webhook is not configured", async () => {
    delete process.env.DISCORD_ANALYTICS_WEBHOOK_URL;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDiscordAnalyticsReport({
      title: "LapLapLa Daily Report",
      content: "Daily report",
    });

    expect(result).toEqual({ ok: true, status: "skipped" });
    expect(warnSpy).toHaveBeenCalledWith(
      "DISCORD_ANALYTICS_WEBHOOK_URL is missing; skipping analytics Discord report",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends analytics reports to the analytics webhook", async () => {
    process.env.DISCORD_ANALYTICS_WEBHOOK_URL = "https://discord.invalid/analytics";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDiscordAnalyticsReport({
      title: "LapLapLa Daily Report",
      content: "Daily report",
    });

    expect(result).toEqual({ ok: true, status: "sent" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.invalid/analytics?wait=true",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("splits long analytics reports across multiple Discord messages", async () => {
    process.env.DISCORD_ANALYTICS_WEBHOOK_URL = "https://discord.invalid/analytics";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDiscordAnalyticsReport({
      title: "LapLapLa Daily Report",
      content: Array.from({ length: 120 }, (_, index) => `Line ${index + 1}: detailed metric`).join("\n"),
    });

    expect(result).toEqual({ ok: true, status: "sent" });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });
});
