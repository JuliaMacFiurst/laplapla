import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDiscordErrorAlert } from "../lib/monitoring/discordAlert";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

function alertInput(title: string) {
  return {
    title,
    level: "error",
    route: "/api/test",
    method: "GET",
    runtime: "server",
    environment: "production",
    statusCode: 500,
  };
}

describe("Discord monitoring alerts", () => {
  it("reports Discord delivery failures", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.invalid/webhook";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("invalid webhook", { status: 404 }),
    ));

    const result = await sendDiscordErrorAlert(alertInput("delivery failure test"));

    expect(result).toMatchObject({
      ok: false,
      status: "discord-error",
    });
  });

  it("does not throttle a retry after Discord rejects the first delivery", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.invalid/webhook";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("temporary failure", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const input = alertInput("retry after delivery failure test");

    const firstResult = await sendDiscordErrorAlert(input);
    const retryResult = await sendDiscordErrorAlert(input);

    expect(firstResult).toMatchObject({ ok: false, status: "discord-error" });
    expect(retryResult).toEqual({ ok: true, status: "sent" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("includes Sentry and Vercel links in the payload", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.invalid/webhook";
    process.env.SENTRY_ORG = "laplapla";
    process.env.VERCEL_PROJECT_DASHBOARD_URL = "https://vercel.com/example/runtime-logs";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDiscordErrorAlert({
      ...alertInput("linked alert test"),
      eventId: "event-123",
      requestId: "request-456",
    });

    expect(result).toEqual({ ok: true, status: "sent" });
    const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(payload.embeds[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Sentry Event ID", value: "event-123" }),
      expect.objectContaining({ name: "Request ID", value: "request-456" }),
      expect.objectContaining({ name: expect.stringContaining("Open in Sentry") }),
      expect.objectContaining({ name: "Open in Vercel" }),
    ]));
  });

  it("does not send non-production alerts", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.invalid/webhook";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendDiscordErrorAlert({
      ...alertInput("development alert test"),
      environment: "development",
    });

    expect(result).toMatchObject({ ok: false, status: "wrong-environment" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
