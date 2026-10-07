import { createServerSupabaseClient } from "@/lib/server/supabase";
import { ensureReceiptArtifacts } from "./artifacts";

export const RECEIPT_ARTIFACT_RECOVERY_BATCH_SIZE = 25;

export type ReceiptArtifactRecoverySummary = {
  scanned: number;
  complete: number;
  incomplete: number;
  failedReceiptIds: string[];
};

export async function findReceiptArtifactRecoveryCandidateIds(limit = RECEIPT_ARTIFACT_RECOVERY_BATCH_SIZE) {
  const bounded = Math.min(RECEIPT_ARTIFACT_RECOVERY_BATCH_SIZE, Math.max(1, limit));
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("list_receipt_artifact_recovery_candidates", { target_limit: bounded });
  if (error) throw error;
  return (data ?? []).map((row: { receipt_id: string }) => row.receipt_id);
}

export async function recoverReceiptArtifacts(): Promise<ReceiptArtifactRecoverySummary> {
  const receiptIds = await findReceiptArtifactRecoveryCandidateIds();
  const summary: ReceiptArtifactRecoverySummary = { scanned: receiptIds.length, complete: 0, incomplete: 0, failedReceiptIds: [] };
  for (const receiptId of receiptIds) {
    try {
      const result = await ensureReceiptArtifacts(receiptId, { source: "recovery" });
      if (result.complete) summary.complete += 1;
      else {
        summary.incomplete += 1;
        summary.failedReceiptIds.push(receiptId);
      }
    } catch {
      summary.incomplete += 1;
      summary.failedReceiptIds.push(receiptId);
    }
  }
  return summary;
}
