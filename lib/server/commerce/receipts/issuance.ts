import { createServerSupabaseClient } from "@/lib/server/supabase";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";
import { ensureReceiptArtifacts } from "@/lib/server/commerce/receipts/artifacts";

export type ReceiptIssuanceSource = "capture" | "webhook" | "recovery";

type ReceiptRpcResult =
  | "issued"
  | "already_issued"
  | "order_not_found"
  | "order_not_paid"
  | "sandbox_order"
  | "unknown_environment"
  | "invalid_order_integrity"
  | "missing_customer_snapshot"
  | "missing_capture_identity"
  | "missing_product_snapshot"
  | "no_active_issuer_profile"
  | "no_active_receipt_series";

export type ReceiptIssuanceResult =
  | { status: "issued" | "already_issued"; receiptId: string; displayNumber: string }
  | { status: "not_eligible"; code: string; needsReview: boolean }
  | { status: "failed"; code: string };

const EXPECTED_NON_ELIGIBLE = new Set<ReceiptRpcResult>([
  "order_not_found",
  "order_not_paid",
  "sandbox_order",
  "unknown_environment",
  "missing_customer_snapshot",
  "missing_capture_identity",
  "missing_product_snapshot",
]);

const REVIEW_REQUIRED = new Set<ReceiptRpcResult>([
  "order_not_found",
  "missing_customer_snapshot",
  "missing_capture_identity",
  "missing_product_snapshot",
]);

function safeOperationalError(orderId: string, source: ReceiptIssuanceSource, code: string) {
  return new Error(`Receipt issuance failed code=${code} order=${orderId} source=${source}`);
}

async function reportOperationalFailure(orderId: string, source: ReceiptIssuanceSource, code: string) {
  console.error(JSON.stringify({
    level: "error",
    message: "Receipt issuance failed",
    internalOrderId: orderId,
    stage: "receipt_issuance",
    source,
    code,
  }));
  try {
    await captureAndAlertServerError(safeOperationalError(orderId, source, code), {
      route: source === "capture" ? "/api/customer/checkout/paypal/capture"
        : source === "webhook" ? "/api/webhooks/paypal"
          : "/api/cron/recover-receipts",
      method: source === "recovery" ? "GET" : "POST",
      runtime: "server",
      statusCode: 503,
    });
  } catch {
    // Receipt observability must never change payment or entitlement semantics.
  }
}

export async function issueReceiptAfterPaidFinalization(input: {
  orderId: string;
  source: ReceiptIssuanceSource;
}): Promise<ReceiptIssuanceResult> {
  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { data, error } = await supabase.rpc("issue_receipt_for_paid_order", {
      target_order_id: input.orderId,
    });
    if (error) throw error;
    const candidate = Array.isArray(data) ? data[0] : data;
    if (!candidate || typeof candidate !== "object") {
      await reportOperationalFailure(input.orderId, input.source, "empty_rpc_result");
      return { status: "failed", code: "empty_rpc_result" };
    }

    const row = candidate as {
      result?: ReceiptRpcResult;
      issued_receipt_id?: string | null;
      issued_display_number?: string | null;
    };
    if (row.result === "issued" || row.result === "already_issued") {
      if (!row.issued_receipt_id || !row.issued_display_number) {
        await reportOperationalFailure(input.orderId, input.source, "malformed_success_result");
        return { status: "failed", code: "malformed_success_result" };
      }
      try {
        await ensureReceiptArtifacts(row.issued_receipt_id, { source: input.source });
      } catch {
        // A paid order and its receipt remain successful even if artifact setup is unavailable.
      }
      return { status: row.result, receiptId: row.issued_receipt_id, displayNumber: row.issued_display_number };
    }
    if (row.result && EXPECTED_NON_ELIGIBLE.has(row.result)) {
      return { status: "not_eligible", code: row.result, needsReview: REVIEW_REQUIRED.has(row.result) };
    }

    const code = row.result ?? "unexpected_rpc_result";
    await reportOperationalFailure(input.orderId, input.source, code);
    return { status: "failed", code };
  } catch {
    await reportOperationalFailure(input.orderId, input.source, "rpc_unavailable");
    return { status: "failed", code: "rpc_unavailable" };
  }
}
