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

  it.each([
    "shop_view",
    "product_view",
    "preorder_page_view",
    "preorder_submit_attempt",
    "preorder_signup_success",
    "preorder_signup_failed",
  ])("records accepted production taxonomy event %s", async (eventName) => {
    insertMock.mockResolvedValue({ error: null });
    const capture = responseCapture();
    await handler(request(eventName) as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 200, body: { ok: true, status: "recorded" } });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ event_id: "11111111-1111-4111-8111-111111111111", event_name: eventName }));
  });

  it("records a validated product_interest event without customer PII", async () => {
    insertMock.mockResolvedValue({ error: null });
    const req = request("product_interest");
    Object.assign(req.body, {
      properties: {
        product_id: "sound-case-001",
        content_slug: "sound-case-001",
        language: "en",
        entry_point: "product_hero",
        destination: "checkout",
      },
    });
    const capture = responseCapture();
    await handler(req as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 200, body: { ok: true, status: "recorded" } });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_name: "product_interest",
      content_slug: "sound-case-001",
      language: "en",
      entry_point: "product_hero",
      properties: expect.objectContaining({ destination: "checkout", product_id: "sound-case-001" }),
    }));
    expect(JSON.stringify(insertMock.mock.calls)).not.toMatch(/email|customer_name|provider_order_id/iu);
  });

  it.each([
    { product_id: "sound-case-001", content_slug: "sound-case-001", language: "en", entry_point: "unknown", destination: "checkout" },
    { product_id: "sound-case-001", content_slug: "sound-case-001", language: "en", entry_point: "home_promo", destination: "product" },
    { product_id: "buyer@example.com", content_slug: "sound-case-001", language: "en", entry_point: "home_promo", destination: "checkout" },
  ])("rejects invalid product_interest properties", async (properties) => {
    const req = request("product_interest");
    Object.assign(req.body, { properties });
    const capture = responseCapture();
    await handler(req as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 400, body: { error: "Invalid product interest properties" } });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects arbitrary event names", async () => {
    const capture = responseCapture();
    await handler(request("purchase_completed") as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 400, body: { error: "Unknown analytics event" } });
    expect(insertMock).not.toHaveBeenCalled();
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

  it("strips query-string and property PII from acquisition-enriched analytics", async () => {
    insertMock.mockResolvedValue({ error: null });
    const req = request("product_view");
    req.body.page = "/shop/sound-case-001?utm_source=youtube&email=private@example.com";
    Object.assign(req.body, {
      properties: {
        current_page: "/shop/sound-case-001?utm_source=youtube&email=private@example.com",
        referrer: "https://www.google.com/search?q=private@example.com",
        attribution_session_source: "youtube",
        attribution_utm_campaign: "private@example.com",
      },
    });
    const capture = responseCapture();
    await handler(req as never, capture.response as never);
    expect(capture.result()).toEqual({ statusCode: 200, body: { ok: true, status: "recorded" } });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      page: "/shop/sound-case-001",
      current_page: "/shop/sound-case-001",
      referrer: "https://www.google.com/search",
      properties: expect.objectContaining({
        current_page: "/shop/sound-case-001",
        referrer: "https://www.google.com/search",
        attribution_session_source: "youtube",
      }),
    }));
    expect(JSON.stringify(insertMock.mock.calls)).not.toContain("private@example.com");
  });
});
