import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => mocks.db() }));

import { buildRefundEmail, sendRefundEmailOnce } from "@/lib/server/commerce/refundEmail";

const operationId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";

function fixture(environment: "sandbox" | "live" = "sandbox", locale: "ru" | "en" | "he" = "ru") {
  const state = {
    operation: { id: operationId, order_id: orderId, entitlement_id: "access-1", status: "completed",
      provider_environment: environment, amount_minor: 3900, currency: "ILS", provider_refund_id: "refund-1",
      provider_confirmed_at: "2026-10-17T10:00:00Z", access_revoked_at: "2026-10-17T10:01:00Z" },
    delivery: { operation_id: operationId, status: "pending", attempt_count: 0,
      claim_token: null as string | null, provider_email_id: null as string | null,
      error_code: null as string | null },
    order: { id: orderId, status: "paid", provider_environment: environment, total_minor: 3900,
      currency: "ILS", customer_email_snapshot: "buyer@example.test",
      order_items: [{ entitlement_id: "access-1", product_title_snapshot: "Sound Case #001" }] },
    locale,
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
        async maybeSingle() {
          if (table === "commerce_refund_operations") return { data: state.operation, error: null };
          if (table === "orders") return { data: state.order, error: null };
          if (table === "checkout_consents") return { data: { locale: state.locale }, error: null };
          if (table !== "commerce_refund_email_deliveries") throw new Error(`Unexpected table ${table}`);
          if (!changes) return { data: { ...state.delivery }, error: null };
          if (Object.entries(filters).some(([key, value]) =>
            state.delivery[key as keyof typeof state.delivery] !== value)) return { data: null, error: null };
          Object.assign(state.delivery, changes);
          return { data: { operation_id: operationId }, error: null };
        },
      };
      return builder;
    },
  }));
  return state;
}

describe("refund confirmation email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFUND_EMAIL_ENABLED = "true";
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_FROM_EMAIL = "LapLapLa <support@example.test>";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.REFUND_EMAIL_ENABLED;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it.each(["ru", "en", "he"] as const)("sends a localized Sandbox refund email for %s once", async (locale) => {
    const state = fixture("sandbox", locale);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "resend-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "accepted", code: undefined });
    expect(state.delivery).toMatchObject({ status: "accepted", attempt_count: 1, provider_email_id: "resend-1" });
    const request = fetchMock.mock.calls[0][1];
    const message = JSON.parse(request.body);
    expect(message.to).toEqual(["buyer@example.test"]);
    expect(message.subject).toBe({
      ru: "LapLapLa: тестовый возврат подтверждён",
      en: "LapLapLa: test refund confirmed",
      he: "LapLapLa: החזר ניסיוני אושר",
    }[locale]);
    expect(message.text).toContain("TEST REFUND");
    expect(message.text).toContain("39.00 ILS");
    expect(message.html).toContain(`lang="${locale}"`);
    expect(message.html).toContain(`dir="${locale === "he" ? "rtl" : "ltr"}"`);
    expect(message.html).toContain("https://www.laplapla.com/");
    expect(message.attachments).toBeUndefined();
    expect(request.headers["Idempotency-Key"]).toBe(`refund-confirmation/${operationId}`);
    expect(state.tables).not.toContain("receipts");
    expect(state.tables).not.toContain("receipt_artifacts");
    await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "already_accepted" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses an ordinary Live refund message with a public HTTPS support link", async () => {
    const state = fixture("live", "he");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "resend-live" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendRefundEmailOnce(operationId)).resolves.toMatchObject({ status: "accepted" });
    const message = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(message.subject).toBe("LapLapLa: ההחזר הכספי אושר");
    expect(message.text).not.toMatch(/TEST REFUND|TEST PURCHASE|TEST DOCUMENT|localhost/iu);
    expect(message.html).not.toMatch(/TEST REFUND|TEST PURCHASE|TEST DOCUMENT|localhost/iu);
    expect(message.html).toContain('dir="rtl"');
    expect(message.text).toContain("https://www.laplapla.com/");
    expect(message.attachments).toBeUndefined();
    expect(state.tables).not.toContain("receipts");
  });

  it.each(["prepared", "dispatching", "provider_pending", "provider_confirmed", "failed", "uncertain", "needs_review"])(
    "does not email a %s refund", async (status) => {
      const state = fixture(); state.operation.status = status;
      const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
      await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "skipped", code: "refund_not_completed" });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(state.delivery.status).toBe("pending");
    },
  );

  it("does not send on an environment mismatch between the order and refund", async () => {
    const state = fixture("live"); state.order.provider_environment = "sandbox";
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(sendRefundEmailOnce(operationId)).resolves.toMatchObject({ status: "failed" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.operation.status).toBe("completed");
  });

  it("allows one provider call under concurrent requests", async () => {
    const state = fixture();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "resend-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([sendRefundEmailOnce(operationId), sendRefundEmailOnce(operationId)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.delivery.attempt_count).toBe(1);
  });

  it("keeps a timeout uncertain and never blindly retries", async () => {
    const state = fixture();
    const fetchMock = vi.fn().mockRejectedValue(new Error("timeout")); vi.stubGlobal("fetch", fetchMock);
    await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "uncertain", code: "provider_response_unknown" });
    await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "skipped", code: "uncertain" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.operation.status).toBe("completed");
  });

  it("records a provider rejection while leaving the refund completed", async () => {
    const state = fixture(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "failed", code: "resend_400" });
    expect(state.operation.status).toBe("completed");
    expect(state.delivery.status).toBe("failed");
  });

  it("is off until the new migration and sender configuration are approved", async () => {
    delete process.env.REFUND_EMAIL_ENABLED;
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(sendRefundEmailOnce(operationId)).resolves.toEqual({ status: "skipped", code: "disabled" });
    expect(mocks.db).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("escapes product data in HTML and never labels Live as test", () => {
    const message = buildRefundEmail({ environment: "live", lang: "en", product: "A <script>",
      amountMinor: 3900, currency: "ILS", orderId, confirmedAt: "2026-10-17T10:00:00Z" });
    expect(message.html).toContain("A &lt;script&gt;");
    expect(message.html).not.toContain("<script>");
    expect(message.text).not.toMatch(/TEST REFUND|localhost/iu);
  });
});
