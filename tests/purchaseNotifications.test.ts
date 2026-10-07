import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), alert: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/monitoring/discordPurchase", () => ({ sendDiscordPurchaseNotification: mocks.send }));
vi.mock("@/lib/monitoring/captureAndAlertServerError", () => ({ captureAndAlertServerError: mocks.alert }));

import { notifyPaidOrderPurchase, recoverPurchaseNotifications } from "@/lib/server/commerce/purchaseNotifications";
import { recoverPurchaseNotificationsHandler } from "@/pages/api/cron/recover-purchase-notifications";

const orderId = "11111111-1111-4111-8111-111111111111";
const claim = {
  result: "claimed",
  notification_id: "22222222-2222-4222-8222-222222222222",
  claim_token: "33333333-3333-4333-8333-333333333333",
  product_title: "Sound Case #001 - LapLapLa",
  amount_minor: 4900,
  currency: "ILS",
  provider: "paypal",
  paid_at: "2026-10-07T12:00:00.000Z",
  price_source: "catalog",
};

function response() {
  const result = { status: 200, body: null as unknown };
  const res = {
    setHeader: vi.fn(),
    status: vi.fn((status: number) => { result.status = status; return res; }),
    json: vi.fn((body: unknown) => { result.body = body; return res; }),
  } as unknown as NextApiResponse;
  return { res, result };
}

describe("purchase notification coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({ ok: true, status: "sent", messageId: "discord-message-1" });
    mocks.alert.mockResolvedValue(undefined);
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_paid_order_purchase_notification") return { data: [claim], error: null };
      if (name === "complete_purchase_notification") return { data: "sent", error: null };
      if (name === "fail_purchase_notification") return { data: "failed", error: null };
      if (name === "list_purchase_notification_recovery_candidates") return { data: [], error: null };
      throw new Error(`Unexpected RPC ${name}`);
    });
  });

  it("sends one trusted persisted Live purchase and records its Discord message id", async () => {
    await expect(notifyPaidOrderPurchase({ orderId, source: "capture" })).resolves.toEqual({ status: "sent" });
    expect(mocks.send).toHaveBeenCalledWith({
      notificationId: claim.notification_id,
      orderId,
      product: claim.product_title,
      amountMinor: 4900,
      currency: "ILS",
      provider: "paypal",
      paidAt: claim.paid_at,
      priceSource: "catalog",
    });
    expect(JSON.stringify(mocks.send.mock.calls)).not.toMatch(/email|billing|payer|address/iu);
    expect(mocks.rpc).toHaveBeenCalledWith("complete_purchase_notification", {
      target_notification_id: claim.notification_id,
      target_claim_token: claim.claim_token,
      target_discord_message_id: "discord-message-1",
    });
  });

  it.each(["sandbox_order", "unknown_environment", "order_not_paid", "not_registered", "processing", "already_sent"])(
    "does not send for %s",
    async (result) => {
      mocks.rpc.mockResolvedValueOnce({ data: [{ result, notification_id: claim.notification_id }], error: null });
      const expected = result === "already_sent" ? { status: "already_sent" } : { status: "skipped", code: result };
      await expect(notifyPaidOrderPurchase({ orderId, source: "webhook" })).resolves.toEqual(expected);
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ ok: false, status: "not-configured", code: "missing_webhook" }, false],
    [{ ok: false, status: "discord-error", code: "network_error" }, true],
    [{ ok: false, status: "discord-error", code: "http_500" }, true],
  ])("isolates delivery failure %#", async (delivery, alerts) => {
    mocks.send.mockResolvedValueOnce(delivery);
    await expect(notifyPaidOrderPurchase({ orderId, source: "capture" })).resolves.toEqual({
      status: "failed", code: delivery.code,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("fail_purchase_notification", expect.objectContaining({
      target_notification_id: claim.notification_id,
      target_claim_token: claim.claim_token,
    }));
    expect(mocks.alert).toHaveBeenCalledTimes(alerts ? 1 : 0);
  });

  it("recovers a bounded list and continues after one failure", async () => {
    mocks.rpc.mockImplementation(async (name: string, args: { target_order_id?: string }) => {
      if (name === "list_purchase_notification_recovery_candidates") {
        return { data: [{ order_id: "order-a" }, { order_id: "order-b" }], error: null };
      }
      if (name === "claim_paid_order_purchase_notification") {
        return { data: [{ ...claim, notification_id: `notification-${args.target_order_id}` }], error: null };
      }
      if (name === "complete_purchase_notification") return { data: "sent", error: null };
      if (name === "fail_purchase_notification") return { data: "failed", error: null };
      throw new Error(name);
    });
    mocks.send
      .mockResolvedValueOnce({ ok: false, status: "discord-error", code: "network_error" })
      .mockResolvedValueOnce({ ok: true, status: "sent", messageId: "discord-2" });
    await expect(recoverPurchaseNotifications()).resolves.toEqual({
      scanned: 2, sent: 1, alreadySent: 0, skipped: 0, failed: 1, failedOrderIds: ["order-a"],
    });
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("protects recovery with the established CRON_SECRET convention", async () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-test-secret";
    const unauthorized = response();
    await recoverPurchaseNotificationsHandler({ method: "GET", headers: {} } as NextApiRequest, unauthorized.res);
    expect(unauthorized.result.status).toBe(401);

    const authorized = response();
    await recoverPurchaseNotificationsHandler({
      method: "GET", headers: { authorization: "Bearer cron-test-secret" },
    } as NextApiRequest, authorized.res);
    expect(authorized.result).toMatchObject({ status: 200, body: { ok: true, scanned: 0 } });
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});
