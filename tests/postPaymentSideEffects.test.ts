import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ receipt: vi.fn(), purchase: vi.fn(), sandboxEmail: vi.fn() }));
vi.mock("@/lib/server/commerce/receipts/issuance", () => ({ issueReceiptAfterPaidFinalization: mocks.receipt }));
vi.mock("@/lib/server/commerce/purchaseNotifications", () => ({ notifyPaidOrderPurchase: mocks.purchase }));
vi.mock("@/lib/server/commerce/sandboxPurchaseEmail", () => ({ sendSandboxPurchaseEmailOnce: mocks.sandboxEmail }));

import { runPaidOrderSideEffects } from "@/lib/server/commerce/postPayment";

describe("paid order side effects", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.sandboxEmail.mockResolvedValue({ status: "skipped", code: "not_paid_sandbox" }); });

  it("runs receipt and purchase notification independently", async () => {
    mocks.receipt.mockResolvedValue({ status: "failed", code: "rpc_unavailable" });
    mocks.purchase.mockResolvedValue({ status: "sent" });
    await expect(runPaidOrderSideEffects({ orderId: "order-1", source: "capture" })).resolves.toEqual({
      receipt: { status: "failed", code: "rpc_unavailable" },
      purchaseNotification: { status: "sent" },
      sandboxEmail: { status: "skipped", code: "not_paid_sandbox" },
    });
    expect(mocks.receipt).toHaveBeenCalledTimes(1);
    expect(mocks.purchase).toHaveBeenCalledTimes(1);
    expect(mocks.sandboxEmail).toHaveBeenCalledTimes(1);
  });

  it("does not let notification failure prevent receipt orchestration", async () => {
    mocks.receipt.mockResolvedValue({ status: "issued", receiptId: "receipt-1", displayNumber: "WEB-000001" });
    mocks.purchase.mockResolvedValue({ status: "failed", code: "network_error" });
    await expect(runPaidOrderSideEffects({ orderId: "order-1", source: "webhook" })).resolves.toMatchObject({
      receipt: { status: "issued" }, purchaseNotification: { status: "failed" },
    });
  });

  it("isolates unexpected throws in either side effect", async () => {
    mocks.receipt.mockRejectedValue(new Error("receipt throw"));
    mocks.purchase.mockResolvedValue({ status: "sent" });
    await expect(runPaidOrderSideEffects({ orderId: "order-1", source: "capture" })).resolves.toEqual({
      receipt: { status: "failed", code: "unexpected_receipt_failure" },
      purchaseNotification: { status: "sent" },
      sandboxEmail: { status: "skipped", code: "not_paid_sandbox" },
    });

    mocks.receipt.mockResolvedValue({ status: "issued" });
    mocks.purchase.mockRejectedValue(new Error("notification throw"));
    await expect(runPaidOrderSideEffects({ orderId: "order-1", source: "capture" })).resolves.toEqual({
      receipt: { status: "issued" },
      purchaseNotification: { status: "failed", code: "unexpected_notification_failure" },
      sandboxEmail: { status: "skipped", code: "not_paid_sandbox" },
    });
  });

  it("keeps a paid order successful when Sandbox email delivery fails", async () => {
    mocks.receipt.mockResolvedValue({ status: "not_eligible", code: "sandbox_order", needsReview: false });
    mocks.purchase.mockResolvedValue({ status: "sent" });
    mocks.sandboxEmail.mockRejectedValue(new Error("provider unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(runPaidOrderSideEffects({ orderId: "order-1", source: "capture" })).resolves.toMatchObject({
      receipt: { status: "not_eligible", code: "sandbox_order" },
      purchaseNotification: { status: "sent" },
      sandboxEmail: { status: "failed", code: "unexpected_sandbox_email_failure" },
    });
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
