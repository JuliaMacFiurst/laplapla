import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({
    from: () => ({ insert: insertMock }),
  }),
}));

vi.mock("@/utils/rateLimit", () => ({
  applyApiGuard: () => true,
  applyDistributedApiGuard: async () => true,
}));

import handler from "../pages/api/analytics/event";

function responseCapture() {
  let statusCode = 200;
  let body: unknown;
  return {
    response: {
      setHeader: vi.fn(),
      status(code: number) { statusCode = code; return this; },
      json(value: unknown) { body = value; return this; },
    },
    result: () => ({ statusCode, body }),
  };
}

function request(eventName = "page_view") {
  return {
    method: "POST",
    headers: {
      host: "laplapla.com",
      origin: "https://laplapla.com",
      referer: "https://laplapla.com/cats",
    },
    body: {
      eventId: "11111111-1111-4111-8111-111111111111",
      eventName,
      page: "/cats",
      visitorId: "22222222-2222-4222-8222-222222222222",
      sessionId: "33333333-3333-4333-8333-333333333333",
    },
  };
}

describe("analytics ingestion API", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    insertMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["shop_view", "product_view"])("records accepted production taxonomy event %s", async (eventName) => {
    insertMock.mockResolvedValue({ error: null });
    const capture = responseCapture();
    await handler(request(eventName) as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 200, body: { ok: true, status: "recorded" } });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ event_id: "11111111-1111-4111-8111-111111111111", event_name: eventName }));
  });

  it("returns duplicate idempotent success and does not create a second logical event", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505" } });
    const capture = responseCapture();
    await handler(request() as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 200, body: { ok: true, status: "duplicate" } });
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("returns an explicit skipped status before touching Supabase", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const capture = responseCapture();
    await handler(request() as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 200, body: { ok: true, status: "skipped", reason: "vercel_preview" } });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
