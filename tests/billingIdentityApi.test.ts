import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), get: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/server/auth/customerAccess", () => ({ resolveCustomerAccess: mocks.access }));
vi.mock("@/lib/server/customerBillingIdentity", () => ({
  BillingIdentityError: class BillingIdentityError extends Error { constructor(public code: string) { super(code); } },
  getTrustedBillingIdentity: mocks.get,
  saveTrustedBillingIdentity: mocks.save,
}));

import { customerBillingIdentityHandler } from "@/pages/api/customer/billing-identity";

function req(method: "GET" | "PUT", body?: unknown, origin = "http://localhost:3000") {
  return { method, body, headers: { origin }, cookies: {}, socket: { remoteAddress: "127.0.0.1" } } as unknown as NextApiRequest;
}
function response() {
  const result = { status: 200, body: null as unknown };
  const res = { headersSent: false, statusCode: 200, setHeader: vi.fn(), status: vi.fn((status: number) => { result.status = status; return res; }), json: vi.fn((body: unknown) => { result.body = body; return res; }) } as unknown as NextApiResponse;
  return { res, result };
}

describe("customer billing identity API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ isAuthenticated: true, accessToken: "token", user: { id: "user-1", email: "buyer@example.com", email_confirmed_at: "2026-10-01" } });
    mocks.get.mockResolvedValue({ billingName: null, email: "buyer@example.com", complete: false });
    mocks.save.mockResolvedValue({ billingName: "יוליה מכלין", email: "buyer@example.com", complete: true });
  });

  it("rejects anonymous requests", async () => {
    mocks.access.mockResolvedValue({ isAuthenticated: false, accessToken: null, user: null });
    const target = response(); await customerBillingIdentityHandler(req("GET"), target.res);
    expect(target.result.status).toBe(401);
  });

  it("reads a sanitized identity and derives email server-side", async () => {
    const target = response(); await customerBillingIdentityHandler(req("GET"), target.res);
    expect(target.result.body).toEqual({ billingName: null, email: "buyer@example.com", complete: false });
  });

  it("writes only billingName for the authenticated user", async () => {
    const target = response(); await customerBillingIdentityHandler(req("PUT", { billingName: "יוליה מכלין" }), target.res);
    expect(target.result.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), "יוליה מכלין");
  });

  it("rejects foreign origins and extra identity fields", async () => {
    const foreign = response(); await customerBillingIdentityHandler(req("PUT", { billingName: "Julia Example" }, "https://evil.example"), foreign.res);
    expect(foreign.result.status).toBe(403);
    const spoof = response(); await customerBillingIdentityHandler(req("PUT", { billingName: "Julia Example", email: "fake@example.com" }), spoof.res);
    expect(spoof.result.status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
