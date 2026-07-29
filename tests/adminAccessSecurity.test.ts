import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest } from "next";

const getUser = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({
    auth: { getUser },
  }),
}));

import { resolveAdminAccess } from "@/lib/server/auth/adminAccess";
import { isAllowedSameOriginRequest } from "@/lib/server/security/requestOrigin";

function request(headers: Record<string, string> = {}) {
  return { headers, socket: {} } as unknown as NextApiRequest;
}

describe("admin access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  it("rejects a request without a token", async () => {
    await expect(resolveAdminAccess(request())).resolves.toMatchObject({
      isAdmin: false,
      isAuthenticated: false,
    });
  });

  it("rejects an invalid token", async () => {
    getUser.mockRejectedValueOnce(new Error("invalid"));
    await expect(
      resolveAdminAccess(request({ authorization: "Bearer invalid.token.value" })),
    ).resolves.toMatchObject({ isAdmin: false, isAuthenticated: false });
  });

  it("rejects an authenticated non-admin", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { email: "user@example.com" } },
      error: null,
    });
    await expect(
      resolveAdminAccess(request({ authorization: "Bearer valid.user.token" })),
    ).resolves.toMatchObject({ isAdmin: false, isAuthenticated: true });
  });

  it("accepts only the configured admin email", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { email: "ADMIN@example.com" } },
      error: null,
    });
    await expect(
      resolveAdminAccess(request({ authorization: "Bearer valid.admin.token" })),
    ).resolves.toMatchObject({ isAdmin: true, isAuthenticated: true });
  });
});

describe("admin write Origin policy", () => {
  it("accepts production same-origin and local development", () => {
    expect(isAllowedSameOriginRequest(request({ origin: "https://www.laplapla.com" }))).toBe(true);
    expect(isAllowedSameOriginRequest(request({ origin: "http://localhost:3000" }))).toBe(true);
  });

  it("rejects cross-origin browser writes", () => {
    expect(isAllowedSameOriginRequest(request({ origin: "https://evil.example" }))).toBe(false);
  });
});
