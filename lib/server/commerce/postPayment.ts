import { issueReceiptAfterPaidFinalization } from "@/lib/server/commerce/receipts/issuance";
import { notifyPaidOrderPurchase, type PurchaseNotificationSource } from "@/lib/server/commerce/purchaseNotifications";

export async function runPaidOrderSideEffects(input: {
  orderId: string;
  source: PurchaseNotificationSource;
}) {
  const [receiptResult, notificationResult] = await Promise.allSettled([
    issueReceiptAfterPaidFinalization(input),
    notifyPaidOrderPurchase(input),
  ]);
  return {
    receipt: receiptResult.status === "fulfilled"
      ? receiptResult.value
      : { status: "failed" as const, code: "unexpected_receipt_failure" },
    purchaseNotification: notificationResult.status === "fulfilled"
      ? notificationResult.value
      : { status: "failed" as const, code: "unexpected_notification_failure" },
  };
}
