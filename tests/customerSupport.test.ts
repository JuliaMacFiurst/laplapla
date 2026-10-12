import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { SUPPORT_CATEGORIES, supportSubject } from "@/lib/support/types";
import { supportCopy } from "@/lib/support/copy";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { applyDistributedApiGuard } from "@/utils/rateLimit";

const mocks = vi.hoisted(() => ({ access: vi.fn(), db: vi.fn(), notify: vi.fn(), discordCreated: vi.fn(), discordReview: vi.fn() }));
vi.mock("@/lib/server/auth/customerAccess", () => ({
  resolveCustomerAccess: mocks.access,
  extractCustomerBearerToken: (req: NextApiRequest) => req.headers.authorization?.replace(/^Bearer /, "") ?? null,
}));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: mocks.db }));
vi.mock("@/lib/server/customerSupport", () => ({ sendSupportNotification: mocks.notify }));
vi.mock("@/lib/server/supportDiscord", () => ({
  notifySupportDiscordCreated: mocks.discordCreated,
  notifySupportDiscordReview: mocks.discordReview,
}));

import { supportRequestHandler } from "@/pages/api/support/requests";

const orderId = "22222222-2222-4222-8222-222222222222";
const base = { submissionId: "33333333-3333-4333-8333-333333333333", locale: "ru", category: "refund", email: "buyer@example.com", orderReference: orderId, message: "Please review my order." };

function request(body: unknown, headers: Record<string, string> = {}) {
  return { method: "POST", body, query: {}, cookies: {}, headers: { origin: "http://localhost:3000", ...headers }, socket: { remoteAddress: "127.0.0.1" } } as unknown as NextApiRequest;
}
function response() {
  const result = { status: 200, body: null as unknown };
  const res = { setHeader: vi.fn(), status: vi.fn((code: number) => { result.status = code; return res; }), json: vi.fn((value: unknown) => { result.body = value; return res; }) } as unknown as NextApiResponse;
  return { res, result };
}

describe("customer support request API", () => {
  const insert = vi.fn();
  const orderLookup = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ isAuthenticated: false, user: null });
    mocks.notify.mockResolvedValue("accepted");
    mocks.discordCreated.mockResolvedValue("sent");
    mocks.discordReview.mockResolvedValue("sent");
    orderLookup.mockResolvedValue({ data: { id: orderId, order_items: [{ product_title_snapshot: "Sound Case #001" }] }, error: null });
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "ticket-1" }, error: null }) }) });
    mocks.db.mockReturnValue({ from: (table: string) => table === "orders"
      ? { select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ maybeSingle: orderLookup }) }) }) }) }
      : { insert } });
  });

  it("stores a guest order reference without looking up a customer's order", async () => {
    const target = response();
    await supportRequestHandler(request(base), target.res);
    expect(target.result).toEqual({ status: 202, body: { ok: true, status: "received", requestId: "ticket-1" } });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ email: "buyer@example.com", order_reference: orderId, order_id: null, product_title: null }));
    expect(orderLookup).not.toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledWith("ticket-1");
    expect(mocks.discordCreated).toHaveBeenCalledOnce();
    expect(mocks.discordCreated).toHaveBeenCalledWith("ticket-1");
  });

  it.each(SUPPORT_CATEGORIES)("saves the %s category without changing the order", async (category) => {
    const target = response();
    await supportRequestHandler(request({ ...base, category }), target.res);
    expect(target.result.status).toBe(202);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ category, order_id: null }));
    expect(mocks.discordCreated).toHaveBeenCalledWith("ticket-1");
  });

  it("binds an authenticated order only after the owner-scoped lookup", async () => {
    mocks.access.mockResolvedValue({ isAuthenticated: true, user: { id: "owner-1", email: "verified@example.com" } });
    const target = response();
    await supportRequestHandler(request(base, { authorization: "Bearer good-token" }), target.res);
    expect(orderLookup).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ customer_user_id: "owner-1", email: "verified@example.com", order_id: orderId, product_title: "Sound Case #001" }));
  });

  it("rejects an order that does not belong to the authenticated buyer", async () => {
    mocks.access.mockResolvedValue({ isAuthenticated: true, user: { id: "owner-1", email: "verified@example.com" } });
    orderLookup.mockResolvedValue({ data: null, error: null });
    const target = response();
    await supportRequestHandler(request(base, { authorization: "Bearer good-token" }), target.res);
    expect(target.result).toEqual({ status: 400, body: { ok: false, code: "invalid_request" } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps a saved request successful even when email notification fails", async () => {
    mocks.notify.mockRejectedValue(new Error("provider unavailable"));
    const target = response();
    await supportRequestHandler(request(base), target.res);
    expect(target.result.status).toBe(202);
    expect(insert).toHaveBeenCalledOnce();
    expect(mocks.discordCreated).toHaveBeenCalledOnce();
  });

  it("keeps Resend independent when Discord rejects the new-request alert", async () => {
    mocks.discordCreated.mockRejectedValue(new Error("Discord unavailable"));
    const target = response();
    await supportRequestHandler(request(base), target.res);
    expect(target.result.status).toBe(202);
    expect(mocks.notify).toHaveBeenCalledWith("ticket-1");
  });

  it.each(["failed", "uncertain"])("warns separately when Resend is %s", async (result) => {
    mocks.notify.mockResolvedValue(result);
    const target = response();
    await supportRequestHandler(request(base), target.res);
    expect(target.result.status).toBe(202);
    expect(mocks.discordCreated).toHaveBeenCalledWith("ticket-1");
    expect(mocks.discordReview).toHaveBeenCalledWith("ticket-1");
  });

  it("still acknowledges the saved request if the review warning fails", async () => {
    mocks.notify.mockResolvedValue("failed");
    mocks.discordReview.mockRejectedValue(new Error("Discord unavailable"));
    const target = response();
    await supportRequestHandler(request(base), target.res);
    expect(target.result.status).toBe(202);
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it("returns the same saved request for a repeated submission ID without sending twice", async () => {
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { code: "23505" } }) }) });
    mocks.db.mockReturnValue({ from: () => ({ insert, select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "ticket-1" }, error: null }) }) }) }) }) });
    const target = response();
    await supportRequestHandler(request(base), target.res);
    expect(target.result.body).toEqual({ ok: true, status: "received", requestId: "ticket-1" });
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.discordCreated).not.toHaveBeenCalled();
  });

  it("discards honeypot submissions before storage or notification", async () => {
    const target = response();
    await supportRequestHandler(request({ ...base, website: "https://spam.example" }), target.res);
    expect(target.result.status).toBe(202);
    expect(insert).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.discordCreated).not.toHaveBeenCalled();
  });

  it("rejects a foreign browser origin before storage", async () => {
    const target = response();
    await supportRequestHandler(request(base, { origin: "https://foreign.example" }), target.res);
    expect(target.result.status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([{ ...base, category: "unknown" }, { ...base, email: "bad\n@example.com" }, { ...base, message: "short" }, { ...base, status: "resolved" }])("rejects invalid or privileged input", async (body) => {
    const target = response();
    await supportRequestHandler(request(body), target.res);
    expect(target.result.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("support abuse protection", () => {
  it("fails closed when the distributed limiter is unavailable", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const target = response();
    expect(await applyDistributedApiGuard(request(base), target.res, { limit: 3, failClosedOnError: true })).toBe(false);
    expect(target.result.status).toBe(503);
    vi.unstubAllEnvs();
  });
});

describe("support localization and email subjects", () => {
  it.each(["ru", "en", "he"] as const)("has localized support form and route in %s", (lang) => {
    expect(supportCopy[lang].title).toBeTruthy();
    expect(supportCopy[lang].categories.refund).toBeTruthy();
    expect(buildLocalizedPublicPath("/support", lang)).toBe(lang === "ru" ? "/support" : `/${lang}/support`);
  });
  it("uses the requested priority subjects without inventing an order", () => {
    expect(supportSubject("refund", null)).toBe("🚨🚨🚨 LAPLAPLA | REFUND REQUEST");
    expect(supportSubject("refund", orderId)).toBe(`🚨🚨🚨 LAPLAPLA | REFUND REQUEST | ORDER ${orderId}`);
    expect(supportSubject("payment", null)).toBe("🚨🚨 LAPLAPLA | PAYMENT / ACCESS PROBLEM");
    expect(supportSubject("technical", null)).toBe("🚨 LAPLAPLA | TECHNICAL FAILURE");
    expect(supportSubject("question", null)).toBe("📩 LAPLAPLA | CUSTOMER QUESTION");
    expect(supportSubject("other", null)).toBe("📩 LAPLAPLA | CUSTOMER MESSAGE");
  });
});
