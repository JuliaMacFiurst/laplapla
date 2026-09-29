import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { QuestBuilder } from "@/components/shop/QuestBuilder";
import { dictionaries } from "@/i18n";
import {
  MAX_QUEST_PERSONALIZATION_NAME_LENGTH,
  MAX_QUEST_PERSONALIZATION_PAYLOAD_BYTES,
  parseSoundCasePersonalizationPayload,
} from "@/lib/server/questPersonalizationPayload";

const mocks = vi.hoisted(() => ({
  resolveCustomerAccess: vi.fn(),
  getActiveCustomerProductEntitlement: vi.fn(),
  loadQuestPersonalization: vi.fn(),
  saveQuestPersonalization: vi.fn(),
}));

vi.mock("@/lib/server/auth/customerAccess", () => ({
  resolveCustomerAccess: mocks.resolveCustomerAccess,
}));

vi.mock("@/lib/server/questPersonalizations", () => ({
  getActiveCustomerProductEntitlement: mocks.getActiveCustomerProductEntitlement,
  loadQuestPersonalization: mocks.loadQuestPersonalization,
  saveQuestPersonalization: mocks.saveQuestPersonalization,
}));

import personalizationHandler from "@/pages/api/customer/sound-case-001-personalization";

const personalization = {
  locale: "en" as const,
  leadName: "Maya",
  participants: ["Noa", "Sam"],
};

const entitlement = {
  id: "entitlement-a",
  user_id: "user-a",
  product_id: "sound-case-001",
  status: "active" as const,
};

function request(method: "GET" | "PUT", body?: unknown): NextApiRequest {
  return { method, body, headers: {}, query: {} } as unknown as NextApiRequest;
}

function response() {
  const result = { status: 0, body: null as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader: vi.fn((name: string, value: string) => { result.headers[name] = value; }),
    status: vi.fn((status: number) => {
      result.status = status;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      result.body = body;
      return res;
    }),
  } as unknown as NextApiResponse;
  return { res, result };
}

describe("Sound Case personalization API security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCustomerAccess.mockResolvedValue({
      isAuthenticated: true,
      accessToken: "token-a",
      user: { id: "user-a" },
    });
    mocks.getActiveCustomerProductEntitlement.mockResolvedValue(entitlement);
  });

  it.each(["GET", "PUT"] as const)("rejects anonymous %s requests", async (method) => {
    mocks.resolveCustomerAccess.mockResolvedValue({
      isAuthenticated: false,
      accessToken: null,
      user: null,
    });
    const { res, result } = response();
    await personalizationHandler(request(method, { personalization }), res);
    expect(result.status).toBe(401);
    expect(mocks.loadQuestPersonalization).not.toHaveBeenCalled();
    expect(mocks.saveQuestPersonalization).not.toHaveBeenCalled();
  });

  it.each(["missing", "inactive", "revoked", "refunded", "expired"])(
    "denies write when the server cannot resolve an active entitlement (%s)",
    async () => {
      mocks.getActiveCustomerProductEntitlement.mockResolvedValue(null);
      const { res, result } = response();
      await personalizationHandler(request("PUT", { personalization }), res);
      expect(result.status).toBe(403);
      expect(mocks.saveQuestPersonalization).not.toHaveBeenCalled();
    },
  );

  it("loads only through the authenticated user's server-resolved entitlement", async () => {
    mocks.loadQuestPersonalization.mockResolvedValue({ personalization, updatedAt: "2026-09-29" });
    const { res, result } = response();
    await personalizationHandler(request("GET"), res);
    expect(result.status).toBe(200);
    expect(mocks.getActiveCustomerProductEntitlement).toHaveBeenCalledWith(
      "token-a",
      "user-a",
      "sound-case-001",
    );
    expect(mocks.loadQuestPersonalization).toHaveBeenCalledWith("token-a", entitlement);
  });

  it("cannot select another user's personalization through query parameters", async () => {
    mocks.loadQuestPersonalization.mockResolvedValue(null);
    const req = request("GET");
    req.query = { entitlement_id: "entitlement-b", user_id: "user-b" };
    const { res, result } = response();
    await personalizationHandler(req, res);
    expect(result.status).toBe(200);
    expect(mocks.getActiveCustomerProductEntitlement).toHaveBeenCalledWith(
      "token-a",
      "user-a",
      "sound-case-001",
    );
    expect(mocks.loadQuestPersonalization).toHaveBeenCalledWith("token-a", entitlement);
  });

  it("saves a validated payload through the server-resolved entitlement", async () => {
    mocks.saveQuestPersonalization.mockResolvedValue({ personalization, updatedAt: "2026-09-29" });
    const { res, result } = response();
    await personalizationHandler(request("PUT", { personalization }), res);
    expect(result.status).toBe(200);
    expect(mocks.saveQuestPersonalization).toHaveBeenCalledWith(entitlement, personalization);
  });

  it.each([
    { personalization, user_id: "user-b" },
    { personalization, entitlement_id: "entitlement-b" },
    { personalization, product_id: "another-product" },
  ])("rejects browser-supplied ownership fields", async (body) => {
    const { res, result } = response();
    await personalizationHandler(request("PUT", body), res);
    expect(result.status).toBe(400);
    expect(mocks.saveQuestPersonalization).not.toHaveBeenCalled();
  });
});

describe("Sound Case personalization payload validation", () => {
  it("accepts and normalizes the current builder shape", () => {
    expect(parseSoundCasePersonalizationPayload({
      locale: "he",
      leadName: "  מאיה  ",
      participants: ["נועה", "", "  דן "],
    })).toEqual({
      ok: true,
      value: { locale: "he", leadName: "מאיה", participants: ["נועה", "דן"] },
    });
  });

  it.each([
    null,
    { locale: "de", leadName: "Maya", participants: [] },
    { locale: "en", leadName: "<script>", participants: [] },
    { locale: "en", leadName: "Maya", participants: [], extra: true },
    { locale: "en", leadName: "Maya", participants: Array.from({ length: 9 }, () => "Name") },
  ])("rejects an invalid payload", (value) => {
    expect(parseSoundCasePersonalizationPayload(value).ok).toBe(false);
  });

  it("rejects overlong names and keeps the total payload bounded", () => {
    const overlong = "x".repeat(MAX_QUEST_PERSONALIZATION_NAME_LENGTH + 1);
    expect(parseSoundCasePersonalizationPayload({
      locale: "en",
      leadName: overlong,
      participants: [],
    }).ok).toBe(false);
    expect(MAX_QUEST_PERSONALIZATION_PAYLOAD_BYTES).toBe(4096);
  });
});

describe("Sound Case personalization persistence contract", () => {
  const migration = readFileSync(
    `${process.cwd()}/supabase/migrations/202609290002_create_quest_personalizations.sql`,
    "utf8",
  );
  const persistenceSource = readFileSync(
    `${process.cwd()}/lib/server/questPersonalizations.ts`,
    "utf8",
  );

  it("enforces one record per entitlement and entitlement/user/product consistency", () => {
    expect(migration).toContain("unique (entitlement_id)");
    expect(migration).toContain("foreign key (entitlement_id, user_id, product_id)");
    expect(migration).toContain("references public.product_entitlements (id, user_id, product_id)");
  });

  it("allows browser reads only for the current user and no browser writes", () => {
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain("entitlement.status = 'active'");
    expect(migration).toContain("revoke all on table public.quest_personalizations from anon, authenticated");
    expect(migration).toContain("grant select on table public.quest_personalizations to authenticated");
    expect(migration).not.toContain("grant insert on table public.quest_personalizations to authenticated");
  });

  it("upserts by entitlement so repeated saves update instead of duplicating", () => {
    expect(persistenceSource).toContain('.upsert({');
    expect(persistenceSource).toContain('{ onConflict: "entitlement_id" }');
    expect(persistenceSource).toContain('createServerSupabaseClient({ serviceRole: true })');
  });

  it("rechecks active entitlement status in the database at write time", () => {
    expect(migration).toContain("quest_personalizations_require_active_entitlement");
    expect(migration).toContain("entitlement.status = 'active'");
    expect(migration).toContain("for update;");
  });

  it("requires ownership and active status while resolving the entitlement", () => {
    expect(persistenceSource).toContain('.eq("user_id", userId)');
    expect(persistenceSource).toContain('.eq("product_id", productId)');
    expect(persistenceSource).toContain('.eq("status", "active")');
  });

  it("restores saved values as the builder's initial state after refresh", () => {
    const html = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "en",
      initialPersonalization: personalization,
    }));
    expect(html).toContain('value="Maya"');
    expect(html).toContain('value="Noa"');
    expect(html).toContain('value="Sam"');
  });

  it.each(["ru", "en", "he"] as const)("has localized save states in %s", (locale) => {
    const copy = dictionaries[locale].shop.soundCase.builder;
    expect(copy.save).toBeTruthy();
    expect(copy.saving).toBeTruthy();
    expect(copy.saved).toBeTruthy();
    expect(copy.saveFailed).toBeTruthy();
    expect(copy.loadingPersonalization).toBeTruthy();
  });

  it("keeps the Hebrew builder RTL", () => {
    const html = renderToStaticMarkup(createElement(QuestBuilder, {
      interfaceLang: "he",
      initialPersonalization: { locale: "he", leadName: "מאיה", participants: [] },
    }));
    expect(html).toContain('dir="rtl"');
  });
});
