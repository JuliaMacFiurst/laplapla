import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/server/supabase";

export type PaymentProvider = "paypal";
export type ProviderEventStatus = "processing" | "processed" | "failed" | "ignored";
export type ProviderEventClaimStatus = "claimed" | "retry_claimed" | "duplicate" | "conflict";

type ProviderEventClaimRow = {
  event_id: string;
  claim_status: ProviderEventClaimStatus;
  claimed: boolean;
  duplicate: boolean;
  event_status: ProviderEventStatus;
};

function requireProviderIdentifier(value: string, label: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`A valid ${label} is required`);
  }
  return normalized;
}

export async function claimPaymentProviderEvent(input: {
  provider: PaymentProvider;
  providerEventId: string;
  eventType: string;
  transmissionId?: string | null;
  providerOrderId?: string | null;
  providerCaptureId?: string | null;
  rawPayload: string | Uint8Array;
}) {
  const providerEventId = requireProviderIdentifier(input.providerEventId, "provider event id", 180);
  const eventType = requireProviderIdentifier(input.eventType, "provider event type", 160);
  const payloadHash = createHash("sha256").update(input.rawPayload).digest("hex");
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("claim_payment_provider_event", {
    target_provider: input.provider,
    target_provider_event_id: providerEventId,
    target_event_type: eventType,
    target_transmission_id: input.transmissionId?.trim() || null,
    target_provider_order_id: input.providerOrderId?.trim() || null,
    target_provider_capture_id: input.providerCaptureId?.trim() || null,
    target_payload_hash: payloadHash,
  });

  if (error) throw error;
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Provider event claim returned no result");
  }

  const row = candidate as ProviderEventClaimRow;
  if (row.claim_status === "conflict") {
    throw new Error("Provider event identity conflict");
  }

  return {
    eventId: row.event_id,
    claimStatus: row.claim_status,
    claimed: row.claimed,
    duplicate: row.duplicate,
    status: row.event_status,
    payloadHash,
  };
}

export async function setPaymentProviderEventStatus(input: {
  eventId: string;
  status: Exclude<ProviderEventStatus, "processing">;
  failureCode?: string | null;
}) {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase.rpc("set_payment_provider_event_status", {
    target_event_id: input.eventId,
    target_status: input.status,
    target_failure_code: input.status === "failed" ? input.failureCode ?? null : null,
  });

  if (error) throw error;
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Provider event status update returned no result");
  }

  const row = candidate as { result: string; event_status: ProviderEventStatus | null };
  return { result: row.result, status: row.event_status };
}
