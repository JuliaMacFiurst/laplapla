import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { PreorderSignupForm } from "@/components/shop/PreorderSignupForm";
import { dictionaries } from "@/i18n";
import { SOUND_CASE_PREORDER_OFFER } from "@/lib/server/commerce/preorderOffers";
import { isValidPreorderEmail, normalizePreorderEmail } from "@/lib/server/productPreorders";

const preorderMocks = vi.hoisted(() => ({
  registerSoundCasePreorder: vi.fn(),
}));

vi.mock("@/lib/server/productPreorders", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/productPreorders")>();
  return {
    ...original,
    registerSoundCasePreorder: preorderMocks.registerSoundCasePreorder,
  };
});

import preorderHandler, { preorderSignupHandler } from "@/pages/api/shop/preorders";

function request(body: unknown, overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: "POST",
    body,
    query: {},
    cookies: {},
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as unknown as NextApiRequest;
}

function response() {
  const result = { status: 200, body: null as unknown, headers: {} as Record<string, string> };
  const res = {
    headersSent: false,
    statusCode: 200,
    setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }),
    status: vi.fn((status: number) => {
      result.status = status;
      res.statusCode = status;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      result.body = body;
      return res;
    }),
  } as unknown as NextApiResponse;
  return { res, result };
}

const validBody = { email: "maya@example.com", consent: true, locale: "en" };

describe("server-controlled preorder definition", () => {
  it("normalizes email without provider-specific transformations", () => {
    expect(normalizePreorderEmail("  User.Name+tag@Example.COM  ")).toBe("user.name+tag@example.com");
    expect(isValidPreorderEmail("  User.Name+tag@Example.COM  ")).toBe(true);
  });

  it("keeps canonical and preorder prices outside browser input", () => {
    expect(SOUND_CASE_PREORDER_OFFER).toMatchObject({
      productId: "sound-case-001",
      offerCode: "sound-case-001-preorder",
      canonicalPriceMinor: 4900,
      priceMinor: 3900,
      currency: "ILS",
    });
  });
});

describe("preorder signup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preorderMocks.registerSoundCasePreorder.mockResolvedValue({ status: "registered", created: true });
  });

  it("registers a first signup without exposing internal data", async () => {
    const { res, result } = response();
    await preorderSignupHandler(request(validBody), res);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, status: "registered" });
    expect(JSON.stringify(result.body)).not.toMatch(/maya|email|price|offer|created|id/i);
    expect(preorderMocks.registerSoundCasePreorder).toHaveBeenCalledWith({
      email: "maya@example.com",
      locale: "en",
    });
  });

  it("returns exactly the same public result for a duplicate", async () => {
    preorderMocks.registerSoundCasePreorder.mockResolvedValue({ status: "registered", created: false });
    const { res, result } = response();
    await preorderSignupHandler(request(validBody), res);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, status: "registered" });
  });

  it("keeps duplicate races idempotent at the public boundary", async () => {
    preorderMocks.registerSoundCasePreorder
      .mockResolvedValueOnce({ status: "registered", created: true })
      .mockResolvedValueOnce({ status: "registered", created: false });
    const first = response();
    const second = response();
    await Promise.all([
      preorderSignupHandler(request(validBody), first.res),
      preorderSignupHandler(request(validBody), second.res),
    ]);
    expect(first.result.body).toEqual(second.result.body);
    expect(first.result.status).toBe(200);
    expect(second.result.status).toBe(200);
  });

  it.each([
    ["malformed email", { ...validBody, email: "not-an-email" }, "invalid_email"],
    ["too-long email", { ...validBody, email: `${"a".repeat(310)}@example.com` }, "invalid_email"],
    ["missing consent", { email: validBody.email, locale: "en" }, "consent_required"],
    ["false consent", { ...validBody, consent: false }, "consent_required"],
    ["unsupported locale", { ...validBody, locale: "de" }, "unsupported_locale"],
  ])("rejects %s", async (_label, body, code) => {
    const { res, result } = response();
    await preorderSignupHandler(request(body), res);
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ ok: false, code });
    expect(preorderMocks.registerSoundCasePreorder).not.toHaveBeenCalled();
  });

  it.each([
    { ...validBody, price: 3900 },
    { ...validBody, eligible_price: 1 },
    { ...validBody, currency: "USD" },
    { ...validBody, offer_code: "fake" },
    { ...validBody, signed_up_at: "2000-01-01" },
    { ...validBody, product_id: "other" },
  ])("rejects browser-controlled commerce fields", async (body) => {
    const { res, result } = response();
    await preorderSignupHandler(request(body), res);
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ ok: false, code: "invalid_request" });
    expect(preorderMocks.registerSoundCasePreorder).not.toHaveBeenCalled();
  });

  it("returns a closed state without accepting a registration", async () => {
    preorderMocks.registerSoundCasePreorder.mockResolvedValue({ status: "closed", created: false });
    const { res, result } = response();
    await preorderSignupHandler(request(validBody), res);
    expect(result.status).toBe(409);
    expect(result.body).toEqual({ ok: false, code: "preorder_closed" });
  });

  it("returns a generic server error without echoing the email", async () => {
    preorderMocks.registerSoundCasePreorder.mockRejectedValue(new Error("database unavailable"));
    const { res, result } = response();
    await preorderSignupHandler(request(validBody), res);
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ ok: false, code: "unavailable" });
    expect(JSON.stringify(result.body)).not.toContain(validBody.email);
  });

  it("rejects oversized request bodies before the route handler", async () => {
    const { res, result } = response();
    await preorderHandler(request(validBody, {
      headers: { "content-length": String(5 * 1024) },
    }), res);
    expect(result.status).toBe(413);
    expect(preorderMocks.registerSoundCasePreorder).not.toHaveBeenCalled();
  });
});

describe("preorder migration security", () => {
  const migration = readFileSync(
    `${process.cwd()}/supabase/migrations/202609300003_create_product_preorders.sql`,
    "utf8",
  );

  it("blocks browser enumeration and direct writes", () => {
    expect(migration).toContain("alter table public.product_preorders enable row level security");
    expect(migration).toContain("revoke all on table public.product_preorders from public, anon, authenticated");
    expect(migration).not.toMatch(/grant\s+(?:select|insert|update|delete)[^;]*product_preorders[^;]*authenticated/i);
    expect(migration).not.toMatch(/create policy[\s\S]*product_preorders/i);
  });

  it("keeps the internal registration RPC service-role only", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("from public;");
    expect(migration).toContain("from anon;");
    expect(migration).toContain("from authenticated;");
    expect(migration).toContain("to service_role;");
  });

  it("serializes closing and signup and makes duplicate races harmless", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("unique (\n    product_id,\n    offer_code,\n    email_normalized\n  )");
    expect(migration).toContain("on conflict (product_id, offer_code, email_normalized) do nothing");
    expect(migration).toContain("email_normalized = lower(btrim(email_normalized))");
  });
});

describe("localized preorder UI", () => {
  it.each(["ru", "en", "he"] as const)("renders prices, consent and privacy link in %s", (lang) => {
    const html = renderToStaticMarkup(createElement(PreorderSignupForm, {
      lang,
      initialOfferStatus: "open",
      canonicalPriceMinor: 4900,
      preorderPriceMinor: 3900,
      currency: "ILS",
    }));
    expect(html).toContain("49 ₪");
    expect(html).toContain("39 ₪");
    expect(html).toContain(dictionaries[lang].soundCasePreorder.privacyLabel);
    expect(html).toContain(lang === "ru" ? 'href="/privacy"' : `href="/${lang}/privacy"`);
  });

  it("renders the closed state without the email form", () => {
    const html = renderToStaticMarkup(createElement(PreorderSignupForm, {
      lang: "en",
      initialOfferStatus: "closed",
      canonicalPriceMinor: 4900,
      preorderPriceMinor: 3900,
      currency: "ILS",
    }));
    expect(html).toContain(dictionaries.en.soundCasePreorder.closedTitle);
    expect(html).not.toContain('type="email"');
  });
});

describe("preorder routing and analytics isolation", () => {
  it("uses a localized self-canonical indexable page without preorder event calls", () => {
    const pageSource = readFileSync(`${process.cwd()}/pages/shop/[slug]/preorder.tsx`, "utf8");
    const formSource = readFileSync(`${process.cwd()}/components/shop/PreorderSignupForm.tsx`, "utf8");
    expect(pageSource).toContain('path={`/shop/${slug}/preorder`}');
    expect(pageSource).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
    expect(pageSource).not.toContain("noindex");
    expect(`${pageSource}\n${formSource}`).not.toMatch(/preorder_(?:page_view|submit_attempt|signup_success|signup_failed)/);
    expect(`${pageSource}\n${formSource}`).not.toContain("@/lib/analytics");
  });
});
