import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { customerCopy } from "@/lib/customer/copy";
import { hasActiveEntitlement, resolveEntitledCatalogProducts } from "@/lib/customer/catalog";
import type { ProductEntitlement } from "@/lib/customer/types";

const accessMocks = vi.hoisted(() => ({
  resolveCustomerAccess: vi.fn(),
  customerHasActiveProductEntitlement: vi.fn(),
}));

vi.mock("@/lib/server/auth/customerAccess", () => ({
  resolveCustomerAccess: accessMocks.resolveCustomerAccess,
}));

vi.mock("@/lib/server/customerEntitlements", () => ({
  customerHasActiveProductEntitlement: accessMocks.customerHasActiveProductEntitlement,
}));

import productAccessHandler from "@/pages/api/customer/product-access";

function entitlement(overrides: Partial<ProductEntitlement> = {}): ProductEntitlement {
  return {
    id: "entitlement-1",
    user_id: "user-1",
    product_id: "sound-case-001",
    source: "promo",
    status: "active",
    granted_at: "2026-09-29T00:00:00.000Z",
    created_at: "2026-09-29T00:00:00.000Z",
    updated_at: "2026-09-29T00:00:00.000Z",
    ...overrides,
  };
}

function apiRequest(): NextApiRequest {
  return {
    method: "GET",
    query: { productId: "sound-case-001" },
    headers: {},
  } as unknown as NextApiRequest;
}

function apiResponse() {
  const result = { status: 0, body: null as unknown, headers: {} as Record<string, string> };
  const response = {
    setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }),
    status: vi.fn((status: number) => {
      result.status = status;
      return response;
    }),
    json: vi.fn((body: unknown) => {
      result.body = body;
      return response;
    }),
  } as unknown as NextApiResponse;
  return { response, result };
}

describe("customer product access API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not give protected personalization to an anonymous visitor", async () => {
    accessMocks.resolveCustomerAccess.mockResolvedValue({
      isAuthenticated: false,
      accessToken: null,
      user: null,
    });
    const { response, result } = apiResponse();

    await productAccessHandler(apiRequest(), response);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ access: false, reason: "authentication_required" });
    expect(accessMocks.customerHasActiveProductEntitlement).not.toHaveBeenCalled();
  });

  it("denies an authenticated customer without an active entitlement", async () => {
    accessMocks.resolveCustomerAccess.mockResolvedValue({
      isAuthenticated: true,
      accessToken: "customer-token",
      user: { id: "user-1" },
    });
    accessMocks.customerHasActiveProductEntitlement.mockResolvedValue(false);
    const { response, result } = apiResponse();

    await productAccessHandler(apiRequest(), response);

    expect(result.status).toBe(403);
    expect(result.body).toEqual({ access: false, reason: "entitlement_required" });
  });

  it("opens personalization only when the trusted check finds an active entitlement", async () => {
    accessMocks.resolveCustomerAccess.mockResolvedValue({
      isAuthenticated: true,
      accessToken: "customer-token",
      user: { id: "user-1" },
    });
    accessMocks.customerHasActiveProductEntitlement.mockResolvedValue(true);
    const { response, result } = apiResponse();

    await productAccessHandler(apiRequest(), response);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ access: true, reason: null });
    expect(accessMocks.customerHasActiveProductEntitlement).toHaveBeenCalledWith(
      "customer-token",
      "user-1",
      "sound-case-001",
    );
  });
});

describe("entitlement and catalog rules", () => {
  it.each(["inactive", "revoked", "refunded", "expired"] as const)(
    "does not accept a %s entitlement",
    (status) => {
      expect(hasActiveEntitlement([entitlement({ status })], "sound-case-001")).toBe(false);
    },
  );

  it("accepts an active entitlement", () => {
    expect(hasActiveEntitlement([entitlement()], "sound-case-001")).toBe(true);
  });

  it.each(["ru", "en", "he"] as const)(
    "resolves account product metadata from the catalog in %s",
    (lang) => {
      const products = resolveEntitledCatalogProducts([entitlement()], lang);
      expect(products).toHaveLength(1);
      expect(products[0]?.product.id).toBe("sound-case-001");
      expect(products[0]?.title).toBeTruthy();
      expect(products[0]?.description).toBeTruthy();
      expect(customerCopy[lang].purchasesTitle).toBeTruthy();
    },
  );

  it("does not invent metadata for an unknown product id", () => {
    expect(resolveEntitledCatalogProducts([
      entitlement({ product_id: "unknown-product" }),
    ], "en")).toEqual([]);
  });
});

describe("customer RLS and browser security", () => {
  const migrationPath = `${process.cwd()}/supabase/migrations/202609290001_create_customer_profiles_and_product_entitlements.sql`;
  const migration = readFileSync(migrationPath, "utf8");

  it("allows customers to select only rows whose user_id matches auth.uid()", () => {
    expect(migration).toContain('policy "Customers can read their own profile"');
    expect(migration).toContain('policy "Customers can read their own entitlements"');
    expect(migration.match(/using \(\(select auth\.uid\(\)\) = user_id\)/g)).toHaveLength(2);
  });

  it("does not let anon or authenticated browser roles grant entitlements", () => {
    expect(migration).toContain("revoke all on table public.product_entitlements from anon, authenticated");
    expect(migration).toContain("grant select on table public.product_entitlements to authenticated");
    expect(migration).not.toContain("grant insert on table public.product_entitlements to authenticated");
    expect(migration).toContain(
      "revoke all on function public.grant_product_entitlement(uuid, text, text) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.grant_product_entitlement(uuid, text, text) to service_role",
    );
  });

  it("checks active access with a user-scoped client and the authenticated user id", () => {
    const serverSource = readFileSync(
      `${process.cwd()}/lib/server/customerEntitlements.ts`,
      "utf8",
    );
    expect(serverSource).toContain("createServerSupabaseClient({ accessToken })");
    expect(serverSource).toContain('.eq("user_id", userId)');
    expect(serverSource).toContain('.eq("status", "active")');
    expect(serverSource).not.toContain("serviceRole: true");
  });

  it("keeps Hebrew account surfaces RTL", () => {
    const accountSource = readFileSync(`${process.cwd()}/pages/account/index.tsx`, "utf8");
    const signInSource = readFileSync(`${process.cwd()}/pages/account/sign-in.tsx`, "utf8");
    expect(accountSource).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(signInSource).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(renderToStaticMarkup(createElement("main", { dir: "rtl" }, customerCopy.he.accountTitle)))
      .toContain('dir="rtl"');
  });
});
