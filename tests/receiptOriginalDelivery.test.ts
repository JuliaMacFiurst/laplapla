import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: null as unknown, fetch: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => mocks.db }));
import { recoverOriginalReceiptDeliveries, sendOriginalReceiptOnce } from "@/lib/server/commerce/receipts/originalDelivery";

function fakeDatabase(options: { consent?: boolean; firstClaim?: boolean; orderEnvironment?: string } = {}) {
  const updates: Record<string, unknown>[] = [];
  let claimed = false;
  const receipt = { id: "receipt-1", order_id: "order-1", receipt_number: 1,
    customer_snapshot: { email: "buyer@example.com" }, receipt_series: { series_code: "WEB" } };
  const row = (table: string) => ({
    select: () => chain(table),
    insert: async () => ({ error: claimed ? { code: "23505" } : null }),
    update: (value: Record<string, unknown>) => chain(table, value),
  });
  const chain = (table: string, update?: Record<string, unknown>) => {
    const result = {
      eq: () => result,
      lt: () => result,
      in: async () => ({ count: 0, error: null }),
      then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
      select: () => result,
      maybeSingle: async () => {
        if (table === "receipts") return { data: receipt, error: null };
        if (table === "orders") return { data: { status: "paid", provider_environment: options.orderEnvironment ?? "live", provider_capture_id: "capture-1" }, error: null };
        if (table === "checkout_consents") return { data: options.consent === false ? null : { locale: "en" }, error: null };
        if (table === "receipt_artifacts") return { data: { status: "ready", storage_bucket: "private-receipts", storage_key: "receipt.pdf", content_type: "application/pdf" }, error: null };
        if (table === "receipt_original_deliveries") {
          if (update?.status === "sending") {
            if (claimed || options.firstClaim === false) return { data: null, error: null };
            claimed = true;
          }
          if (update) updates.push(update);
          return { data: { receipt_id: "receipt-1" }, error: null };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };
    return result;
  };
  return {
    updates,
    from: row,
    rpc: async () => ({ data: claimed ? [] : [{ receipt_id: "receipt-1" }], error: null }),
    storage: { from: () => ({ download: async () => ({ data: new Blob(["pdf"], { type: "application/pdf" }), error: null }) }) },
  };
}

describe("one-time original receipt email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RECEIPT_ORIGINAL_EMAIL_ENABLED = "true";
    process.env.RESEND_API_KEY = "test-only";
    process.env.RESEND_FROM_EMAIL = "LapLapLa <support@example.test>";
    vi.stubGlobal("fetch", mocks.fetch);
  });
  afterEach(() => {
    delete process.env.RECEIPT_ORIGINAL_EMAIL_ENABLED;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    vi.unstubAllGlobals();
  });

  it("sends the stored original once and records provider acceptance", async () => {
    const db = fakeDatabase(); mocks.db = db;
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: "provider-1" }) });
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("accepted");
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [, request] = mocks.fetch.mock.calls[0];
    expect(request.headers["Idempotency-Key"]).toBe("receipt-original/receipt-1");
    const message = JSON.parse(request.body);
    expect(message.to).toEqual(["buyer@example.com"]);
    expect(message.attachments).toEqual([{ filename: "receipt-WEB-000001.pdf", content: Buffer.from("pdf").toString("base64"), content_type: "application/pdf" }]);
    expect(db.updates.map((update) => update.status)).toEqual(["sending", "accepted"]);
    expect(db.updates[1]).toMatchObject({ provider_email_id: "provider-1" });
  });

  it("never retries after an uncertain provider result", async () => {
    const db = fakeDatabase(); mocks.db = db;
    mocks.fetch.mockRejectedValue(new Error("timeout"));
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("uncertain");
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(db.updates.map((update) => update.status)).toEqual(["sending", "uncertain"]);
  });

  it("does not email without the purchase consent or activation", async () => {
    mocks.db = fakeDatabase({ consent: false });
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    delete process.env.RECEIPT_ORIGINAL_EMAIL_ENABLED;
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("never sends an original receipt for a Sandbox order even if a receipt row exists", async () => {
    mocks.db = fakeDatabase({ orderEnvironment: "sandbox" });
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("records a provider rejection without retrying the original", async () => {
    const db = fakeDatabase(); mocks.db = db;
    mocks.fetch.mockResolvedValue({ ok: false, status: 400 });
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("failed");
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(db.updates.map((update) => update.status)).toEqual(["sending", "failed"]);
  });

  it.each([429, 500, 503])("treats Resend %i as uncertain and never retries automatically", async (status) => {
    const db = fakeDatabase(); mocks.db = db;
    mocks.fetch.mockResolvedValue({ ok: false, status });
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("uncertain");
    await expect(sendOriginalReceiptOnce("receipt-1")).resolves.toBe("skipped");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(db.updates.map((update) => update.status)).toEqual(["sending", "uncertain"]);
  });

  it("allows only one provider call during concurrent original-delivery requests", async () => {
    const db = fakeDatabase(); mocks.db = db;
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: "provider-1" }) });
    const results = await Promise.all([
      sendOriginalReceiptOnce("receipt-1"),
      sendOriginalReceiptOnce("receipt-1"),
    ]);
    expect(results.sort()).toEqual(["accepted", "skipped"]);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(db.updates.map((update) => update.status)).toEqual(["sending", "accepted"]);
  });

  it("recovers an unattempted original once and stays idempotent on the next cron run", async () => {
    const db = fakeDatabase(); mocks.db = db;
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: "provider-1" }) });
    await expect(recoverOriginalReceiptDeliveries()).resolves.toMatchObject({ scanned: 1, accepted: 1 });
    await expect(recoverOriginalReceiptDeliveries()).resolves.toMatchObject({ scanned: 0, accepted: 0 });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("reports an unprocessed candidate for manual review without sending", async () => {
    mocks.db = fakeDatabase({ consent: false });
    await expect(recoverOriginalReceiptDeliveries()).resolves.toMatchObject({
      scanned: 1, skipped: 1, manualReview: 1,
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
