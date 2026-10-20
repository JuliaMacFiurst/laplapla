import { createServerSupabaseClient } from "@/lib/server/supabase";
import { issueReceiptAfterPaidFinalization } from "@/lib/server/commerce/receipts/issuance";

export const RECEIPT_RECOVERY_BATCH_SIZE = 25;

export type ReceiptRecoverySummary = {
  scanned: number;
  issued: number;
  alreadyIssued: number;
  notEligible: number;
  needsReview: number;
  failed: number;
  reviewOrderIds: string[];
  failedOrderIds: string[];
};

export async function findReceiptRecoveryCandidateIds(limit = RECEIPT_RECOVERY_BATCH_SIZE) {
  const boundedLimit = Math.min(RECEIPT_RECOVERY_BATCH_SIZE, Math.max(1, limit));
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("orders")
    .select("id,receipts()")
    .eq("status", "paid")
    .eq("provider_environment", "live")
    .is("receipts", null)
    .order("paid_at", { ascending: true })
    .limit(boundedLimit);
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

export async function recoverMissingPaidOrderReceipts(): Promise<ReceiptRecoverySummary> {
  const orderIds = await findReceiptRecoveryCandidateIds();
  const summary: ReceiptRecoverySummary = {
    scanned: orderIds.length,
    issued: 0,
    alreadyIssued: 0,
    notEligible: 0,
    needsReview: 0,
    failed: 0,
    reviewOrderIds: [],
    failedOrderIds: [],
  };

  for (const orderId of orderIds) {
    const result = await issueReceiptAfterPaidFinalization({ orderId, source: "recovery" });
    if (result.status === "issued") summary.issued += 1;
    else if (result.status === "already_issued") summary.alreadyIssued += 1;
    else if (result.status === "not_eligible") {
      summary.notEligible += 1;
      if (result.needsReview) {
        summary.needsReview += 1;
        summary.reviewOrderIds.push(orderId);
      }
    } else {
      summary.failed += 1;
      summary.failedOrderIds.push(orderId);
    }
  }
  return summary;
}
