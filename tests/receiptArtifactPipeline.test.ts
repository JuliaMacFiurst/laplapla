import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/monitoring/captureAndAlertServerError", () => ({ captureAndAlertServerError: vi.fn() }));
vi.mock("@/lib/server/commerce/receipts/pdfRenderer", () => ({ renderReceiptPdf: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: vi.fn() }));

import { ensureReceiptArtifacts, mapReceiptRowToDocumentSnapshot, type ArtifactDependencies, type ReceiptArtifactClaimRow } from "@/lib/server/commerce/receipts/artifacts";
import { syntheticReceiptFixtures } from "@/lib/server/commerce/receipts/syntheticFixtures";

const receiptId = "11111111-1111-4111-8111-111111111111";
const snapshot = { ...syntheticReceiptFixtures[0], receiptId };

function dependencies(overrides: Partial<ArtifactDependencies> = {}): ArtifactDependencies {
  let count = 0;
  return {
    claim: vi.fn(async (_id, copy): Promise<ReceiptArtifactClaimRow> => ({ result: "claimed", artifact_id: `${copy}-artifact`, claim_token: `${copy}-token`, storage_bucket: "receipt-pdfs", storage_key: `receipts/${receiptId}/${copy}/${copy}-artifact.pdf`, existing_sha256: null, existing_byte_size: null })),
    loadSnapshot: vi.fn(async () => snapshot),
    render: vi.fn(async (_snapshot, copy) => Buffer.from(`pdf-${copy}-${++count}`)),
    upload: vi.fn(async (): Promise<"uploaded"> => "uploaded"), downloadIfExists: vi.fn(async () => null),
    stage: vi.fn(async () => true),
    complete: vi.fn(async () => true), fail: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("receipt PDF artifact coordinator", () => {
  it("generates original and copy with the same immutable receipt and hashes exact bytes", async () => {
    const deps = dependencies();
    const result = await ensureReceiptArtifacts(receiptId, { dependencies: deps });
    expect(result.complete).toBe(true);
    expect(result.copies.map((copy) => [copy.documentCopy, copy.status])).toEqual([["original", "generated"], ["copy", "generated"]]);
    expect(deps.loadSnapshot).toHaveBeenCalledTimes(1);
    expect(deps.render).toHaveBeenNthCalledWith(1, snapshot, "original");
    expect(deps.render).toHaveBeenNthCalledWith(2, snapshot, "copy");
    const original = Buffer.from("pdf-original-1");
    expect(deps.complete).toHaveBeenNthCalledWith(1, "original-artifact", "original-token", original, createHash("sha256").update(original).digest("hex"));
  });

  it("reuses ready artifacts without rendering or uploading", async () => {
    const deps = dependencies({ claim: vi.fn(async (_id, copy): Promise<ReceiptArtifactClaimRow> => ({ result: "ready", artifact_id: `${copy}-artifact`, claim_token: null, storage_bucket: "receipt-pdfs", storage_key: "key", existing_sha256: "a".repeat(64), existing_byte_size: 10 })) });
    const result = await ensureReceiptArtifacts(receiptId, { dependencies: deps });
    expect(result.complete).toBe(true);
    expect(deps.render).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it("preserves a ready original and retries only a failed copy", async () => {
    const deps = dependencies({
      claim: vi.fn(async (_id, copy): Promise<ReceiptArtifactClaimRow> => copy === "original"
        ? { result: "ready", artifact_id: "original-artifact", claim_token: null, storage_bucket: "receipt-pdfs", storage_key: "key", existing_sha256: "a".repeat(64), existing_byte_size: 10 }
        : { result: "claimed", artifact_id: "copy-artifact", claim_token: "copy-token", storage_bucket: "receipt-pdfs", storage_key: `receipts/${receiptId}/copy/copy-artifact.pdf`, existing_sha256: null, existing_byte_size: null }),
      upload: vi.fn(async () => { throw new Error("storage_unavailable"); }),
    });
    const result = await ensureReceiptArtifacts(receiptId, { dependencies: deps });
    expect(result.complete).toBe(false);
    expect(result.copies).toMatchObject([{ documentCopy: "original", status: "ready" }, { documentCopy: "copy", status: "failed", code: "storage_unavailable" }]);
    expect(deps.render).toHaveBeenCalledTimes(1);
    expect(deps.fail).toHaveBeenCalledWith("copy-artifact", "copy-token", "storage_unavailable");
  });

  it("reconciles an already uploaded object only when bytes match", async () => {
    const bytes = Buffer.from("same-pdf");
    const deps = dependencies({ render: vi.fn(async () => bytes), upload: vi.fn(async (): Promise<"exists"> => "exists"), downloadIfExists: vi.fn(async () => bytes) });
    await expect(ensureReceiptArtifacts(receiptId, { dependencies: deps })).resolves.toMatchObject({ complete: true });
    expect(deps.complete).toHaveBeenCalledTimes(2);
  });

  it("reconciles bytes staged by a crashed worker without rerendering", async () => {
    const bytes = Buffer.from("previous-upload");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const deps = dependencies({
      claim: vi.fn(async (_id, copy): Promise<ReceiptArtifactClaimRow> => ({
        result: "claimed", artifact_id: `${copy}-artifact`, claim_token: `${copy}-token`, storage_bucket: "receipt-pdfs",
        storage_key: `receipts/${receiptId}/${copy}/${copy}-artifact.pdf`, existing_sha256: sha256, existing_byte_size: bytes.byteLength,
      })),
      downloadIfExists: vi.fn(async () => bytes),
    });
    await expect(ensureReceiptArtifacts(receiptId, { dependencies: deps })).resolves.toMatchObject({ complete: true });
    expect(deps.render).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.complete).toHaveBeenCalledTimes(2);
  });

  it("does not leak PII into opaque storage keys", async () => {
    const deps = dependencies();
    await ensureReceiptArtifacts(receiptId, { dependencies: deps });
    const keys = vi.mocked(deps.upload).mock.calls.map((call) => call[1]).join(" ");
    expect(keys).toContain(receiptId);
    expect(keys).not.toContain(snapshot.customer.name);
    expect(keys).not.toContain(snapshot.customer.email);
  });

  it("maps only immutable receipt snapshots and rejects missing snapshot fields", () => {
    const row = {
      id: receiptId, receipt_number: 1, issued_at: snapshot.issuedAt,
      seller_snapshot: snapshot.seller, customer_snapshot: snapshot.customer,
      line_items_snapshot: snapshot.lineItems, payment_snapshot: snapshot.payment,
      total_minor: snapshot.totalMinor, currency: snapshot.currency,
      document_version: snapshot.documentVersion, receipt_series: { series_code: "WEB" },
    };
    expect(mapReceiptRowToDocumentSnapshot(row).displayNumber).toBe("WEB-000001");
    expect(() => mapReceiptRowToDocumentSnapshot({ ...row, line_items_snapshot: [] })).toThrow("invalid_line_items_snapshot");
  });
});
