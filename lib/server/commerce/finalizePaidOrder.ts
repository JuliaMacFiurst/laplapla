import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { PaymentProvider } from "@/lib/server/commerce/providerEvents";

export type PaidOrderFinalizationResult =
  | "paid"
  | "already_paid"
  | "unknown_order"
  | "provider_mismatch"
  | "provider_order_mismatch"
  | "invalid_capture_id"
  | "amount_mismatch"
  | "currency_mismatch"
  | "capture_conflict"
  | "provider_event_mismatch"
  | "provider_event_not_claimed"
  | "invalid_state";

export async function finalizeLocalOrderPaid(input: {
  orderId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  providerCaptureId: string;
  confirmedAmountMinor: number;
  confirmedCurrency: string;
  providerEventRecordId?: string | null;
}) {
  if (!Number.isSafeInteger(input.confirmedAmountMinor) || input.confirmedAmountMinor <= 0) {
    throw new Error("A valid confirmed amount is required");
  }

  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("finalize_commerce_order_paid", {
    target_order_id: input.orderId,
    target_provider: input.provider,
    target_provider_order_id: input.providerOrderId,
    target_provider_capture_id: input.providerCaptureId,
    target_confirmed_amount_minor: input.confirmedAmountMinor,
    target_confirmed_currency: input.confirmedCurrency,
    target_provider_event_record_id: input.providerEventRecordId ?? null,
  });

  if (error) throw error;
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Paid order finalization returned no result");
  }

  const row = candidate as {
    result: PaidOrderFinalizationResult;
    finalized_order_id: string;
    finalized_entitlement_id: string | null;
  };

  return {
    result: row.result,
    orderId: row.finalized_order_id,
    entitlementId: row.finalized_entitlement_id,
  };
}
