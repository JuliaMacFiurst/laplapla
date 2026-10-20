import { describe, expect, it, vi } from "vitest";
import { handlePayPalApprovalOnce, paidCheckoutSuccessHref, resumeReturnedPayPalSession } from "@/lib/shop/paypalCheckoutReturn";

describe("PayPal SDK v6 redirect return", () => {
  it.each([
    ["ru", "/shop/sound-case-001/success"],
    ["en", "/en/shop/sound-case-001/success"],
    ["he", "/he/shop/sound-case-001/success"],
  ] as const)("routes a confirmed %s capture to LapLapLa, never Commerce Admin", (lang, path) => {
    const destination = paidCheckoutSuccessHref({ ok: true, status: "paid", localOrderId: "order-1", entitlementId: "entitlement-1" }, lang);
    expect(destination).toBe(`${path}?orderId=order-1`);
    expect(destination).not.toContain("admin");
    expect(paidCheckoutSuccessHref({ ok: false, code: "payment_not_completed" }, lang)).toBeNull();
  });
  it("does not resume or capture on an ordinary checkout visit", async () => {
    const resume = vi.fn();
    const onReturn = vi.fn();
    await expect(resumeReturnedPayPalSession({ hasReturned: () => false, resume }, onReturn))
      .resolves.toBe(false);
    expect(resume).not.toHaveBeenCalled();
    expect(onReturn).not.toHaveBeenCalled();
  });

  it("resumes a returned SDK session once and lets its approval callback own capture", async () => {
    const onApprove = vi.fn();
    const resume = vi.fn(async () => { await onApprove(); });
    const onReturn = vi.fn();
    await expect(resumeReturnedPayPalSession({ hasReturned: () => true, resume }, onReturn))
      .resolves.toBe(true);
    expect(onReturn).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it("propagates SDK errors without initiating another PayPal order", async () => {
    const resume = vi.fn().mockRejectedValue(new Error("SDK return failed"));
    await expect(resumeReturnedPayPalSession({ hasReturned: () => true, resume }, vi.fn()))
      .rejects.toThrow("SDK return failed");
    expect(resume).toHaveBeenCalledOnce();
  });

  it("captures only the matching approved order and ignores duplicate callbacks", async () => {
    const handled = { current: false };
    const capture = vi.fn().mockResolvedValue(undefined);
    const onMismatch = vi.fn();
    const input = {
      paypalOrderId: "PAYPAL_ORDER_1",
      expectedPaypalOrderId: "PAYPAL_ORDER_1",
      handled,
      capture,
      onMismatch,
    };
    await handlePayPalApprovalOnce(input);
    await handlePayPalApprovalOnce(input);
    expect(capture).toHaveBeenCalledOnce();
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("never captures an unbound or mismatched SDK approval", async () => {
    for (const expectedPaypalOrderId of [null, "OTHER_ORDER"] as const) {
      const capture = vi.fn();
      const onMismatch = vi.fn();
      await handlePayPalApprovalOnce({
        paypalOrderId: "PAYPAL_ORDER_1",
        expectedPaypalOrderId,
        handled: { current: false },
        capture,
        onMismatch,
      });
      expect(capture).not.toHaveBeenCalled();
      expect(onMismatch).toHaveBeenCalledOnce();
    }
  });
});
