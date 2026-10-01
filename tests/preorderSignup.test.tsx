import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { PreorderSignupForm } from "@/components/shop/PreorderSignupForm";
import { dictionaries } from "@/i18n";

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

  it("returns a generic server error without logging or echoing the email", async () => {
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
    expect(html).toContain("49");
    expect(html).toContain("39");
    expect(html).toContain("49 ₪");
    expect(html).toContain("39 ₪");
    expect(html).toContain(dictionaries[lang].shop.soundCase.preorder.privacyLabel);
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
    expect(html).toContain(dictionaries.en.shop.soundCase.preorder.closedTitle);
    expect(html).not.toContain('type="email"');
  });

  it("keeps success and error copy localized and Hebrew direction on the page", () => {
    for (const lang of ["ru", "en", "he"] as const) {
      const copy = dictionaries[lang].shop.soundCase.preorder;
      expect(copy.successTitle).toBeTruthy();
      expect(copy.successBody).toContain("39");
      expect(copy.serverError).toBeTruthy();
    }
    const pageSource = readFileSync(`${process.cwd()}/pages/shop/[slug]/preorder.tsx`, "utf8");
    expect(pageSource).toContain('dir={lang === "he" ? "rtl" : "ltr"}');
  });
});

describe("preorder routing and SEO contract", () => {
  it("uses a self-canonical localized indexable page and localized product CTA", () => {
    const pageSource = readFileSync(`${process.cwd()}/pages/shop/[slug]/preorder.tsx`, "utf8");
    const detailSource = readFileSync(`${process.cwd()}/components/shop/ShopProductDetail.tsx`, "utf8");
    expect(pageSource).toContain('path={`/shop/${slug}/preorder`}');
    expect(pageSource).not.toContain("noindex");
    expect(detailSource).toContain("`/shop/${product.slug}/preorder`");
  });
});
