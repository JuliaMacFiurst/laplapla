import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), alert: vi.fn(), ensureArtifacts: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({
  createServerSupabaseClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/monitoring/captureAndAlertServerError", () => ({
  captureAndAlertServerError: mocks.alert,
}));
vi.mock("@/lib/server/commerce/receipts/artifacts", () => ({
  ensureReceiptArtifacts: mocks.ensureArtifacts,
}));

import { issueReceiptAfterPaidFinalization } from "@/lib/server/commerce/receipts/issuance";

const orderId = "11111111-1111-4111-8111-111111111111";
const success = (result: "issued" | "already_issued") => ({
  data: [{
    result,
    issued_receipt_id: "22222222-2222-4222-8222-222222222222",
    issued_display_number: "WEB-000001",
  }],
  error: null,
});

describe("post-payment receipt coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.alert.mockResolvedValue(undefined);
    mocks.ensureArtifacts.mockResolvedValue({ complete: true, copies: [] });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("normalizes newly issued and idempotent replay outcomes", async () => {
    mocks.rpc.mockResolvedValueOnce(success("issued")).mockResolvedValueOnce(success("already_issued"));
    await expect(issueReceiptAfterPaidFinalization({ orderId, source: "capture" })).resolves.toEqual({
      status: "issued", receiptId: "22222222-2222-4222-8222-222222222222", displayNumber: "WEB-000001",
    });
    await expect(issueReceiptAfterPaidFinalization({ orderId, source: "webhook" })).resolves.toEqual({
      status: "already_issued", receiptId: "22222222-2222-4222-8222-222222222222", displayNumber: "WEB-000001",
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.ensureArtifacts).toHaveBeenCalledTimes(2);
  });

  it("keeps successful receipt/payment semantics when artifact generation throws", async () => {
    mocks.rpc.mockResolvedValue(success("issued"));
    mocks.ensureArtifacts.mockRejectedValue(new Error("storage unavailable"));
    await expect(issueReceiptAfterPaidFinalization({ orderId, source: "capture" })).resolves.toMatchObject({
      status: "issued", receiptId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it.each(["sandbox_order", "unknown_environment", "order_not_paid"])(
    "treats %s as expected non-issuance without an alert", async (result) => {
      mocks.rpc.mockResolvedValue({ data: [{ result }], error: null });
      await expect(issueReceiptAfterPaidFinalization({ orderId, source: "recovery" })).resolves.toEqual({
        status: "not_eligible", code: result, needsReview: false,
      });
      expect(mocks.alert).not.toHaveBeenCalled();
    },
  );

  it("surfaces incomplete live orders for review without fabricating data", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ result: "missing_product_snapshot" }], error: null });
    await expect(issueReceiptAfterPaidFinalization({ orderId, source: "recovery" })).resolves.toEqual({
      status: "not_eligible", code: "missing_product_snapshot", needsReview: true,
    });
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it("normalizes and safely reports database or unexpected integrity failures", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("private database detail") });
    await expect(issueReceiptAfterPaidFinalization({ orderId, source: "capture" })).resolves.toEqual({
      status: "failed", code: "rpc_unavailable",
    });
    expect(mocks.alert).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.alert.mock.calls)).not.toContain("private database detail");

    mocks.rpc.mockResolvedValueOnce({ data: [{ result: "invalid_order_integrity" }], error: null });
    await expect(issueReceiptAfterPaidFinalization({ orderId, source: "webhook" })).resolves.toEqual({
      status: "failed", code: "invalid_order_integrity",
    });
    expect(mocks.alert).toHaveBeenCalledTimes(2);
  });
});
