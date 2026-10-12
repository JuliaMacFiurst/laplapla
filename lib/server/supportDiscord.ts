import { createServerSupabaseClient } from "@/lib/server/supabase";
import { sendDiscordSupportNotification } from "@/lib/monitoring/discordSupport";
import type { Lang } from "@/i18n";
import type { SupportCategory } from "@/lib/support/types";

type Kind = "created" | "review";
type SafeRow = {
  id: string;
  category: SupportCategory;
  order_id: string | null;
  locale: Lang;
  created_at: string;
  status: string;
  notification_status: string;
};

const REVIEW_BATCH_SIZE = 4;

async function notify(id: string, kind: Kind): Promise<"sent" | "failed" | "skipped"> {
  const db = createServerSupabaseClient({ serviceRole: true });
  const claimedAt = new Date().toISOString();
  const claimColumn = kind === "created" ? "discord_created_claimed_at" : "discord_review_claimed_at";
  const statusColumn = kind === "created" ? "discord_created_delivery_status" : "discord_review_delivery_status";
  const { data, error } = await db.from("customer_support_requests")
    .update({ [claimColumn]: claimedAt, [statusColumn]: "claimed" })
    .eq("id", id).is(claimColumn, null)
    .select("id,category,order_id,locale,created_at,status,notification_status")
    .maybeSingle();
  if (error) throw error;
  if (!data) return "skipped";
  const row = data as SafeRow;
  const result = await sendDiscordSupportNotification({
    kind, id: row.id, category: row.category, orderId: row.order_id,
    locale: row.locale, createdAt: row.created_at, status: row.status,
    notificationStatus: row.notification_status,
  });
  const deliveryStatus = result.ok ? "sent" : result.status === "uncertain" ? "uncertain" : "failed";
  const completion = await db.from("customer_support_requests")
    .update({ [statusColumn]: deliveryStatus })
    .eq("id", id).eq(claimColumn, claimedAt).eq(statusColumn, "claimed");
  if (completion.error) throw completion.error;
  return result.ok ? "sent" : "failed";
}

export function notifySupportDiscordCreated(id: string) { return notify(id, "created"); }
export function notifySupportDiscordReview(id: string) { return notify(id, "review"); }

export async function recoverSupportDiscordReviewWarnings() {
  const db = createServerSupabaseClient({ serviceRole: true });
  const review = await db.from("customer_support_requests")
    .select("id").is("discord_review_claimed_at", null)
    .in("notification_status", ["failed", "uncertain"])
    .order("created_at", { ascending: true }).limit(REVIEW_BATCH_SIZE);
  if (review.error) throw review.error;
  const remaining = REVIEW_BATCH_SIZE - (review.data?.length ?? 0);
  const pending = remaining > 0 ? await db.from("customer_support_requests")
    .select("id").is("discord_review_claimed_at", null)
    .eq("notification_status", "pending").gt("notification_attempts", 0)
    .order("created_at", { ascending: true }).limit(remaining) : { data: [], error: null };
  if (pending.error) throw pending.error;
  const unconfiguredRemaining = remaining - (pending.data?.length ?? 0);
  const unconfigured = unconfiguredRemaining > 0 ? await db.from("customer_support_requests")
    .select("id").is("discord_review_claimed_at", null)
    .eq("notification_status", "pending").eq("notification_error_code", "provider_not_configured")
    .order("created_at", { ascending: true }).limit(unconfiguredRemaining) : { data: [], error: null };
  if (unconfigured.error) throw unconfigured.error;
  const summary = { scanned: 0, sent: 0, failed: 0 };
  for (const row of [...(review.data ?? []), ...(pending.data ?? []), ...(unconfigured.data ?? [])]) {
    summary.scanned += 1;
    try {
      const result = await notifySupportDiscordReview(row.id);
      if (result === "sent") summary.sent += 1;
      if (result === "failed") summary.failed += 1;
    } catch {
      // The claim may have succeeded before an error. Never resend blindly.
      summary.failed += 1;
    }
  }
  return summary;
}
