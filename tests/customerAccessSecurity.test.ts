import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest } from "next";

const getUser = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({ auth: { getUser } }),
}));

import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";

function request(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as NextApiRequest;
}

describe("customer authentication boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects requests without a bearer token", async () => {
    await expect(resolveCustomerAccess(request())).resolves.toEqual({
      isAuthenticated: false,
      accessToken: null,
      user: null,
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects a token Supabase cannot verify", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    await expect(resolveCustomerAccess(request("Bearer invalid-token"))).resolves.toMatchObject({
      isAuthenticated: false,
    });
  });

  it("accepts a verified customer without applying admin authorization", async () => {
    const user = { id: "customer-1", email: "customer@example.com" };
    getUser.mockResolvedValue({ data: { user }, error: null });
    await expect(resolveCustomerAccess(request("Bearer valid-token"))).resolves.toEqual({
      isAuthenticated: true,
      accessToken: "valid-token",
      user,
    });
    expect(getUser).toHaveBeenCalledWith("valid-token");
  });
});
