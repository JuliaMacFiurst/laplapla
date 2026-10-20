import { createServerSupabaseClient } from "@/lib/server/supabase";
import { supportSubject, type SupportCategory } from "@/lib/support/types";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_RECOVERY_SENDS = 4; // Four 10-second provider timeouts fit within the Hobby function limit.

function isValidSender(value: string): boolean {
  if (EMAIL_PATTERN.test(value)) return true;
  const match = value.match(/^([A-Za-z0-9][A-Za-z0-9 .'-]{0,99}) <([^<>\r\n]+)>$/);
  return Boolean(match && EMAIL_PATTERN.test(match[2]));
}

export type SupportRequestRow = {
  id: string;
  email: string;
  category: SupportCategory;
  message: string;
  order_reference: string | null;
  order_id: string | null;
  product_title: string | null;
  created_at: string;
  notification_status: string;
  notification_attempts: number;
};

export function formatSupportEmail(row: SupportRequestRow) {
  return {
    subject: supportSubject(row.category, row.order_reference),
    text: [
      `Category: ${row.category}`,
      `Created: ${row.created_at}`,
      `Request: ${row.id}`,
      `Customer email: ${row.email}`,
      ...(row.order_reference ? [`${row.order_id ? "Verified order" : "Unverified order reference"}: ${row.order_reference}`] : []),
      ...(row.product_title ? [`Product: ${row.product_title}`] : []),
      "",
      "Message:",
      row.message,
    ].join("\n"),
  };
}

export async function sendSupportNotification(id: string): Promise<"accepted" | "failed" | "uncertain" | "skipped"> {
  const db = createServerSupabaseClient({ serviceRole: true });
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await db.from("customer_support_requests")
    .update({ notification_status: "sending", notification_claimed_at: now, updated_at: now })
    // A previous provider attempt may already have sent the email. The Resend key
    // expires after 24 hours, so only requests never attempted are safe to send.
    .eq("id", id).eq("notification_status", "pending").eq("notification_attempts", 0)
    .select("id,email,category,message,order_reference,order_id,product_title,created_at,notification_status,notification_attempts")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return "skipped";
  const row = claimed as SupportRequestRow;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const recipient = process.env.SUPPORT_NOTIFICATION_EMAIL?.trim();
  const update = async (status: "pending" | "accepted" | "failed" | "uncertain", providerId?: string, code?: string, attempted = true) => {
    const { error } = await db.from("customer_support_requests")
      .update({ notification_status: status, notification_attempts: row.notification_attempts + (attempted ? 1 : 0),
        notification_provider_id: providerId ?? null, notification_error_code: code ?? null,
        notification_accepted_at: status === "accepted" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString() })
      .eq("id", id).eq("notification_status", "sending").eq("notification_claimed_at", now);
    if (error) throw error;
  };
  if (!key || !from || !isValidSender(from) || !recipient || !EMAIL_PATTERN.test(recipient)) {
    await update("pending", undefined, "provider_not_configured", false);
    return "failed";
  }
  const { subject, text } = formatSupportEmail(row);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `support-request/${id}` },
      body: JSON.stringify({ from, to: [recipient], subject, text, reply_to: row.email }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      await update(response.status >= 500 || response.status === 429 ? "failed" : "uncertain", undefined, `resend_${response.status}`);
      return response.status >= 500 || response.status === 429 ? "failed" : "uncertain";
    }
    const payload = await response.json() as { id?: unknown };
    if (typeof payload.id !== "string" || !payload.id) {
      await update("uncertain", undefined, "invalid_provider_response");
      return "uncertain";
    }
    await update("accepted", payload.id);
    return "accepted";
  } catch {
    await update("uncertain", undefined, "provider_response_unknown");
    return "uncertain";
  }
}

export async function recoverSupportNotifications() {
  const db = createServerSupabaseClient({ serviceRole: true });
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const stale = await db.from("customer_support_requests")
    .update({ notification_status: "uncertain", notification_error_code: "claim_timed_out", updated_at: new Date().toISOString() })
    .eq("notification_status", "sending").lt("notification_claimed_at", staleCutoff);
  if (stale.error) throw stale.error;
  const unclaimed = await db.from("customer_support_requests")
    .update({ notification_status: "uncertain", notification_error_code: "claim_time_missing", updated_at: new Date().toISOString() })
    .eq("notification_status", "sending").is("notification_claimed_at", null);
  if (unclaimed.error) throw unclaimed.error;
  const pending = await db.from("customer_support_requests")
    .select("id").eq("notification_status", "pending").eq("notification_attempts", 0)
    .order("created_at", { ascending: true }).limit(MAX_RECOVERY_SENDS);
  if (pending.error) throw pending.error;
  const ids = pending.data ?? [];
  const summary = { scanned: ids.length, accepted: 0, failed: 0, uncertain: 0 };
  for (const row of ids) {
    const result = await sendSupportNotification(row.id);
    if (result === "accepted") summary.accepted += 1;
    if (result === "failed") summary.failed += 1;
    if (result === "uncertain") summary.uncertain += 1;
  }
  // Exact counts include old failures that the daily Hobby cron previously
  // omitted. These states require operator review; never retry them blindly.
  const [reviewStatuses, attemptedPending, pendingRemaining, inFlight] = await Promise.all([
    db.from("customer_support_requests").select("id", { count: "exact", head: true })
      .in("notification_status", ["failed", "uncertain"]),
    db.from("customer_support_requests").select("id", { count: "exact", head: true })
      .eq("notification_status", "pending").gt("notification_attempts", 0),
    db.from("customer_support_requests").select("id", { count: "exact", head: true })
      .eq("notification_status", "pending").eq("notification_attempts", 0),
    db.from("customer_support_requests").select("id", { count: "exact", head: true })
      .eq("notification_status", "sending"),
  ]);
  for (const result of [reviewStatuses, attemptedPending, pendingRemaining, inFlight]) {
    if (result.error) throw result.error;
  }
  return {
    ...summary,
    manualReview: (reviewStatuses.count ?? 0) + (attemptedPending.count ?? 0),
    pendingRemaining: pendingRemaining.count ?? 0,
    inFlight: inFlight.count ?? 0,
  };
}
