import { issueReceiptAfterPaidFinalization } from "@/lib/server/commerce/receipts/issuance";
import { notifyPaidOrderPurchase, type PurchaseNotificationSource } from "@/lib/server/commerce/purchaseNotifications";
import { sendSandboxPurchaseEmailOnce } from "@/lib/server/commerce/sandboxPurchaseEmail";

export async function runPaidOrderSideEffects(input: {
  orderId: string;
  source: PurchaseNotificationSource;
}) {
  const [receiptResult, notificationResult, sandboxEmailResult] = await Promise.allSettled([
    issueReceiptAfterPaidFinalization(input),
    notifyPaidOrderPurchase(input),
    sendSandboxPurchaseEmailOnce(input.orderId),
  ]);
  if (sandboxEmailResult.status === "rejected"
    || (sandboxEmailResult.status === "fulfilled"
      && ["failed", "uncertain"].includes(sandboxEmailResult.value.status))) {
    console.error(JSON.stringify({
      message: "Sandbox purchase email delivery needs attention",
      orderId: input.orderId,
      source: input.source,
      code: sandboxEmailResult.status === "fulfilled"
        ? sandboxEmailResult.value.code ?? sandboxEmailResult.value.status
        : "unexpected_sandbox_email_failure",
    }));
  }
  return {
    receipt: receiptResult.status === "fulfilled"
      ? receiptResult.value
      : { status: "failed" as const, code: "unexpected_receipt_failure" },
    purchaseNotification: notificationResult.status === "fulfilled"
      ? notificationResult.value
      : { status: "failed" as const, code: "unexpected_notification_failure" },
    sandboxEmail: sandboxEmailResult.status === "fulfilled"
      ? sandboxEmailResult.value
      : { status: "failed" as const, code: "unexpected_sandbox_email_failure" },
  };
}
