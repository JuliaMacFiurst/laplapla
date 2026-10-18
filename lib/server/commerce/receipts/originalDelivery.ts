import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { Lang } from "@/i18n";

type DeliveryStatus = "accepted" | "failed" | "uncertain" | "skipped";
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;

const emailCopy: Record<Lang, { subject: string; body: string }> = {
  ru: { subject: "Квитанция LapLapLa", body: "Прилагаем оригинал квитанции за вашу покупку LapLapLa. Сохраните это письмо и вложение. Копию можно получить в личном кабинете." },
  en: { subject: "Your LapLapLa receipt", body: "Your original LapLapLa purchase receipt is attached. Please keep this email and attachment. A copy is available in your account." },
  he: { subject: "קבלה מקורית מ-LapLapLa", body: "מצורפת הקבלה המקורית על הרכישה ב-LapLapLa. מומלץ לשמור את ההודעה ואת הקובץ. העתק זמין בחשבון שלכם." },
};

export async function sendOriginalReceiptOnce(receiptId: string): Promise<DeliveryStatus> {
  // Activation requires a separate accounting/legal sign-off for the PDF format.
  if (process.env.RECEIPT_ORIGINAL_EMAIL_ENABLED !== "true") return "skipped";
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!key || !from) return "skipped";

  const db = createServerSupabaseClient({ serviceRole: true });
  const receiptResult = await db.from("receipts")
    .select("id,order_id,receipt_number,customer_snapshot,receipt_series(series_code)")
    .eq("id", receiptId).eq("document_type", "receipt").maybeSingle();
  if (receiptResult.error) throw receiptResult.error;
  if (!receiptResult.data) return "skipped";
  const receipt = receiptResult.data as unknown as {
    id: string; order_id: string; receipt_number: number;
    customer_snapshot: { email?: unknown };
    receipt_series: { series_code: string } | { series_code: string }[];
  };
  const orderResult = await db.from("orders")
    .select("status,provider_environment,provider_capture_id")
    .eq("id", receipt.order_id).maybeSingle();
  if (orderResult.error) throw orderResult.error;
  if (orderResult.data?.status !== "paid" || orderResult.data.provider_environment !== "live"
    || !orderResult.data.provider_capture_id) return "skipped";
  const customerEmail = receipt.customer_snapshot?.email;
  if (typeof customerEmail !== "string" || !EMAIL_PATTERN.test(customerEmail)) return "skipped";

  const consentResult = await db.from("checkout_consents")
    .select("locale").eq("order_id", receipt.order_id).maybeSingle();
  if (consentResult.error) throw consentResult.error;
  if (!consentResult.data) return "skipped";
  const lang = consentResult.data.locale as Lang;
  if (!emailCopy[lang]) return "skipped";

  const artifactResult = await db.from("receipt_artifacts")
    .select("status,storage_bucket,storage_key,content_type")
    .eq("receipt_id", receiptId).eq("artifact_type", "receipt_pdf")
    .eq("document_copy", "original").maybeSingle();
  if (artifactResult.error) throw artifactResult.error;
  const artifact = artifactResult.data;
  if (!artifact || artifact.status !== "ready" || artifact.content_type !== "application/pdf") return "skipped";

  const series = Array.isArray(receipt.receipt_series) ? receipt.receipt_series[0] : receipt.receipt_series;
  if (!series?.series_code) return "skipped";
  const number = `${series.series_code}-${String(receipt.receipt_number).padStart(6, "0")}`;
  const { data: pdf, error: downloadError } = await db.storage.from(artifact.storage_bucket).download(artifact.storage_key);
  if (downloadError || !pdf) return "skipped";
  const bytes = Buffer.from(await pdf.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) return "skipped";

  const inserted = await db.from("receipt_original_deliveries").insert({ receipt_id: receiptId });
  if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
  const token = randomUUID();
  const claimedAt = new Date().toISOString();
  const claim = await db.from("receipt_original_deliveries")
    .update({ status: "sending", attempt_count: 1, claim_token: token, claimed_at: claimedAt, updated_at: claimedAt })
    .eq("receipt_id", receiptId).eq("status", "pending").eq("attempt_count", 0)
    .select("receipt_id").maybeSingle();
  if (claim.error) throw claim.error;
  if (!claim.data) return "skipped";

  async function finish(status: Exclude<DeliveryStatus, "skipped">, providerId?: string, errorCode?: string) {
    const completed = await db.from("receipt_original_deliveries")
      .update({ status, provider_email_id: providerId ?? null,
        accepted_at: status === "accepted" ? new Date().toISOString() : null,
        error_code: errorCode ?? null, updated_at: new Date().toISOString() })
      .eq("receipt_id", receiptId).eq("status", "sending").eq("claim_token", token)
      .select("receipt_id").maybeSingle();
    if (completed.error || !completed.data) throw completed.error ?? new Error("Receipt delivery completion lost");
  }

  let outcome: Exclude<DeliveryStatus, "skipped"> = "uncertain";
  let providerId: string | undefined;
  let errorCode: string | undefined;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `receipt-original/${receiptId}` },
      body: JSON.stringify({
        from, to: [customerEmail], subject: `${emailCopy[lang].subject} ${number}`,
        text: emailCopy[lang].body,
        attachments: [{ filename: `receipt-${number}.pdf`, content: bytes.toString("base64"), content_type: "application/pdf" }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      outcome = response.status >= 500 || response.status === 429 ? "uncertain" : "failed";
      errorCode = `resend_${response.status}`;
    } else {
      const payload = await response.json() as { id?: unknown };
      if (typeof payload.id === "string" && payload.id) {
        outcome = "accepted";
        providerId = payload.id;
      } else errorCode = "invalid_provider_response";
    }
  } catch {
    // A timeout can mean the email was accepted. Never retry this original automatically.
    errorCode = "provider_response_unknown";
  }
  await finish(outcome, providerId, errorCode);
  return outcome;
}

export async function recoverOriginalReceiptDeliveries() {
  if (process.env.RECEIPT_ORIGINAL_EMAIL_ENABLED !== "true") return null;
  const db = createServerSupabaseClient({ serviceRole: true });
  const staleCutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const stale = await db.from("receipt_original_deliveries")
    .update({ status: "uncertain", error_code: "claim_timed_out", updated_at: new Date().toISOString() })
    .eq("status", "sending").lt("claimed_at", staleCutoff);
  if (stale.error) throw stale.error;

  const candidates = await db.rpc("list_receipt_original_delivery_candidates", { target_limit: 3 });
  if (candidates.error) throw candidates.error;
  const summary = { scanned: 0, accepted: 0, failed: 0, uncertain: 0, skipped: 0, manualReview: 0 };
  for (const row of (candidates.data ?? []) as { receipt_id: string }[]) {
    summary.scanned += 1;
    const result = await sendOriginalReceiptOnce(row.receipt_id);
    if (result === "accepted") summary.accepted += 1;
    if (result === "failed") summary.failed += 1;
    if (result === "uncertain") summary.uncertain += 1;
    if (result === "skipped") summary.skipped += 1;
  }
  const review = await db.from("receipt_original_deliveries")
    .select("receipt_id", { count: "exact", head: true }).in("status", ["failed", "uncertain"]);
  if (review.error) throw review.error;
  summary.manualReview = (review.count ?? 0) + summary.skipped;
  return summary;
}
