import { createServerSupabaseClient } from "@/lib/server/supabase";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";
import { sendDiscordPurchaseNotification } from "@/lib/monitoring/discordPurchase";

export type PurchaseNotificationSource = "capture" | "webhook" | "recovery";
export type PurchaseNotificationResult =
  | { status: "sent" | "already_sent" }
  | { status: "skipped"; code: string }
  | { status: "failed"; code: string };

type ClaimRow = {
  result?: string;
  notification_id?: string | null;
  claim_token?: string | null;
  product_title?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  provider?: string | null;
  paid_at?: string | null;
  price_source?: string | null;
};

async function safeAlert(orderId: string, source: PurchaseNotificationSource, code: string) {
  try {
    await captureAndAlertServerError(
      new Error(`Purchase notification failed code=${code} order=${orderId} source=${source}`),
      {
        route: source === "capture" ? "/api/customer/checkout/paypal/capture"
          : source === "webhook" ? "/api/webhooks/paypal"
            : "/api/cron/recover-purchase-notifications",
        method: source === "recovery" ? "GET" : "POST",
        runtime: "server",
        statusCode: 503,
      },
    );
  } catch {
    // Observability must never affect payment, access, receipt, or webhook semantics.
  }
}

async function markFailed(notificationId: string, claimToken: string, code: string) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  await supabase.rpc("fail_purchase_notification", {
    target_notification_id: notificationId,
    target_claim_token: claimToken,
    target_failure_code: code,
  });
}

export async function notifyPaidOrderPurchase(input: {
  orderId: string;
  source: PurchaseNotificationSource;
}): Promise<PurchaseNotificationResult> {
  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { data, error } = await supabase.rpc("claim_paid_order_purchase_notification", {
      target_order_id: input.orderId,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as ClaimRow | null;
    if (!row?.result) throw new Error("empty_claim_result");
    if (row.result === "already_sent") return { status: "already_sent" };
    if (["processing", "not_registered", "sandbox_order", "unknown_environment", "order_not_paid", "order_not_found"].includes(row.result)) {
      return { status: "skipped", code: row.result };
    }
    if (row.result !== "claimed" || !row.notification_id || !row.claim_token || !row.product_title
      || !Number.isSafeInteger(row.amount_minor) || !row.currency || !row.provider
      || !row.paid_at || !row.price_source) {
      await safeAlert(input.orderId, input.source, row.result || "malformed_claim");
      return { status: "failed", code: row.result || "malformed_claim" };
    }

    const delivery = await sendDiscordPurchaseNotification({
      notificationId: row.notification_id,
      orderId: input.orderId,
      product: row.product_title,
      amountMinor: row.amount_minor as number,
      currency: row.currency,
      provider: row.provider,
      paidAt: row.paid_at,
      priceSource: row.price_source,
    });
    if (!delivery.ok) {
      await markFailed(row.notification_id, row.claim_token, delivery.code).catch(() => undefined);
      if (delivery.status !== "not-configured") await safeAlert(input.orderId, input.source, delivery.code);
      return { status: "failed", code: delivery.code };
    }

    const completion = await supabase.rpc("complete_purchase_notification", {
      target_notification_id: row.notification_id,
      target_claim_token: row.claim_token,
      target_discord_message_id: delivery.messageId,
    });
    if (completion.error || completion.data !== "sent") {
      await safeAlert(input.orderId, input.source, "completion_failed");
      return { status: "failed", code: "completion_failed" };
    }
    return { status: "sent" };
  } catch {
    await safeAlert(input.orderId, input.source, "notification_unavailable");
    return { status: "failed", code: "notification_unavailable" };
  }
}

export const PURCHASE_NOTIFICATION_RECOVERY_BATCH_SIZE = 25;

export async function recoverPurchaseNotifications() {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("list_purchase_notification_recovery_candidates", {
    target_limit: PURCHASE_NOTIFICATION_RECOVERY_BATCH_SIZE,
  });
  if (error) throw error;
  const ids = (data ?? []).map((row: { order_id: string }) => row.order_id);
  const summary = { scanned: ids.length, sent: 0, alreadySent: 0, skipped: 0, failed: 0, failedOrderIds: [] as string[] };
  for (const orderId of ids) {
    const result = await notifyPaidOrderPurchase({ orderId, source: "recovery" });
    if (result.status === "sent") summary.sent += 1;
    else if (result.status === "already_sent") summary.alreadySent += 1;
    else if (result.status === "skipped") summary.skipped += 1;
    else {
      summary.failed += 1;
      summary.failedOrderIds.push(orderId);
    }
  }
  return summary;
}
