import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => mocks.db() }));
vi.mock("@/lib/server/commerce/sandboxPurchasePdf", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/commerce/sandboxPurchasePdf")>()),
  renderSandboxPurchasePdf: mocks.pdf,
}));

import { sendSandboxPurchaseEmailOnce } from "@/lib/server/commerce/sandboxPurchaseEmail";
import { renderSandboxPurchaseHtml, sandboxChromeOverride } from "@/lib/server/commerce/sandboxPurchasePdf";

const orderId = "11111111-1111-4111-8111-111111111111";
const paidOrder = {
  id: orderId, user_id: "buyer-id", status: "paid", provider_environment: "sandbox",
  provider_capture_id: "sandbox-capture", total_minor: 3900, currency: "ILS",
  paid_at: "2026-10-15T10:00:00.000Z", customer_email_snapshot: "buyer@example.test",
  order_items: [{ product_id: "sound-case-001", product_title_snapshot: "Sound Case #001", entitlement_id: "entitlement-id" }],
};

function fixture(locale: "ru" | "en" | "he" = "en") {
  const state = {
    order: { ...paidOrder },
    delivery: { order_id: orderId, status: "pending", attempt_count: 0,
      claim_token: null as string | null, provider_email_id: null as string | null },
    active: true,
    locale,
    updates: [] as Array<Record<string, unknown>>,
    tables: [] as string[],
  };
  mocks.db.mockImplementation(() => ({
    from(table: string) {
      state.tables.push(table);
      let changes: Record<string, unknown> | null = null;
      const filters: Record<string, unknown> = {};
      const builder = {
        select() { return builder; },
        update(value: Record<string, unknown>) { changes = value; return builder; },
        eq(column: string, value: unknown) { filters[column] = value; return builder; },
        lt() { return builder; },
        async maybeSingle() {
          if (table === "orders") return { data: state.order, error: null };
          if (table === "product_entitlements") return { data: state.active ? { id: "entitlement-id" } : null, error: null };
          if (table === "checkout_consents") return { data: { locale: state.locale }, error: null };
          if (table !== "sandbox_purchase_email_deliveries") throw new Error(`Unexpected table ${table}`);
          if (!changes) return { data: { ...state.delivery }, error: null };
          if (Object.entries(filters).some(([key, value]) =>
            state.delivery[key as keyof typeof state.delivery] !== value)) return { data: null, error: null };
          Object.assign(state.delivery, changes);
          state.updates.push(changes);
          return { data: { order_id: orderId }, error: null };
        },
      };
      return builder;
    },
    rpc(name: string) {
      if (name === "list_sandbox_purchase_email_recovery_candidates") return { data: [], error: null };
      throw new Error(name);
    },
  }));
  return state;
}

describe("Sandbox purchase delivery", () => {
  it("uses local Chrome for a macOS Sandbox PDF without changing the Linux renderer", () => {
    expect(sandboxChromeOverride("darwin")).toBe("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    expect(sandboxChromeOverride("darwin", "/custom/chrome")).toBe("/custom/chrome");
    expect(sandboxChromeOverride("linux")).toBeNull();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_FROM_EMAIL = "LapLapLa Support <support@example.test>";
    process.env.SANDBOX_PURCHASE_SITE_URL = "https://preview.example.test";
    mocks.pdf.mockResolvedValue(Buffer.from("synthetic-pdf"));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.SANDBOX_PURCHASE_SITE_URL;
  });

  it.each(["ru", "en", "he"] as const)("sends one localized PDF email for %s and records acceptance", async (locale) => {
    const state = fixture(locale);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "resend-id" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toEqual({ status: "accepted", code: undefined });
    expect(state.delivery).toMatchObject({ status: "accepted", attempt_count: 1, provider_email_id: "resend-id" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1];
    const payload = JSON.parse(request.body);
    expect(payload.to).toEqual(["buyer@example.test"]);
    expect(payload.subject).toBe({
      ru: "🧪 LapLapLa: тестовая покупка подтверждена",
      en: "🧪 LapLapLa: Test purchase confirmed",
      he: "🧪 LapLapLa: אישור רכישת ניסיון",
    }[locale]);
    expect(payload.text).toContain("39.00 ILS");
    expect(payload.text).toContain("/shop/sound-case-001/create");
    expect(payload.text).toMatch(/test purchase|тестовая покупка|רכישת ניסיון/iu);
    expect(payload.attachments[0]).toMatchObject({ filename: "laplapla-sandbox-test-document.pdf", content_type: "application/pdf" });
    expect(request.headers["Idempotency-Key"]).toBe(`sandbox-purchase/${orderId}`);
    expect(state.tables).not.toContain("receipts");
    expect(state.tables).not.toContain("receipt_ledger");
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toEqual({ status: "already_accepted" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.pdf).toHaveBeenCalledTimes(1);
  });

  it("does not send for pending or cancelled orders or inactive access", async () => {
    const state = fixture();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const status of ["pending_approval", "cancelled", "failed"]) {
      state.order.status = status;
      await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toMatchObject({ status: "skipped" });
    }
    state.order.status = "paid";
    state.active = false;
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toMatchObject({ status: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses one atomic claim for concurrent capture and webhook callbacks", async () => {
    const state = fixture();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "resend-id" }) });
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([sendSandboxPurchaseEmailOnce(orderId), sendSandboxPurchaseEmailOnce(orderId)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.delivery.attempt_count).toBe(1);
  });

  it.each([
    [503, "uncertain"], [429, "uncertain"], [400, "failed"],
  ] as const)("classifies Resend HTTP %i without affecting the paid order", async (httpStatus, status) => {
    const state = fixture();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: httpStatus }));
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toMatchObject({ status });
    expect(state.order.status).toBe("paid");
    expect(state.delivery.status).toBe(status);
  });

  it("keeps ambiguous timeouts uncertain and never resends automatically", async () => {
    fixture();
    const fetchMock = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toMatchObject({ status: "uncertain" });
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toMatchObject({ status: "skipped", code: "uncertain" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("records a failed PDF render without calling Resend or changing the paid order", async () => {
    const state = fixture();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mocks.pdf.mockRejectedValueOnce(new Error("browser_unavailable"));
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toEqual({
      status: "failed", code: "test_pdf_generation_failed",
    });
    expect(state.delivery).toMatchObject({ status: "failed", attempt_count: 1,
      provider_email_id: null, error_code: "test_pdf_generation_failed" });
    expect(state.order.status).toBe("paid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send for Live and does not render a test PDF", async () => {
    const state = fixture();
    state.order.provider_environment = "live";
    vi.stubGlobal("fetch", vi.fn());
    await expect(sendSandboxPurchaseEmailOnce(orderId)).resolves.toMatchObject({ status: "skipped" });
    expect(mocks.pdf).not.toHaveBeenCalled();
  });

  it("marks the PDF as a test document in all three languages without an official number", () => {
    const html = renderSandboxPurchaseHtml({ orderId, product: "Sound Case #001", amountMinor: 3900,
      currency: "ILS", paidAt: "2026-10-15T10:00:00.000Z" }, { global: "data:font/ttf;base64,AA==", hebrew: "data:font/ttf;base64,AA==" });
    for (const label of ["ТЕСТОВЫЙ ДОКУМЕНТ", "TEST DOCUMENT", "מסמך לבדיקה בלבד",
      "НЕ ЯВЛЯЕТСЯ КВИТАНЦИЕЙ", "NOT A TAX RECEIPT", "אינו קבלה לצורכי מס"]) expect(html).toContain(label);
    expect(html).toContain("39.00 ILS");
    expect(html).not.toMatch(/receipt number|display_number|WEB-\d+/iu);
  });
});
