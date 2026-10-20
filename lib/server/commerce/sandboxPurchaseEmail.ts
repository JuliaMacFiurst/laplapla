import { randomUUID } from "node:crypto";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { renderSandboxPurchasePdf } from "@/lib/server/commerce/sandboxPurchasePdf";

type EmailStatus = "accepted" | "already_accepted" | "skipped" | "failed" | "uncertain";
type OrderRow = {
  id: string; user_id: string; status: string; provider_environment: string | null;
  provider_capture_id: string | null; total_minor: number; currency: string;
  paid_at: string | null; customer_email_snapshot: string | null;
  order_items: Array<{ product_id: string; product_title_snapshot: string | null; entitlement_id: string | null }>
    | { product_id: string; product_title_snapshot: string | null; entitlement_id: string | null } | null;
};
type DeliveryRow = { status: "pending" | "sending" | "accepted" | "failed" | "uncertain"; attempt_count: number };

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const copy: Record<Lang, { subject: string; body: (input: { product: string; amount: string; date: string; url: string }) => string }> = {
  ru: {
    subject: "🧪 LapLapLa: тестовая покупка подтверждена",
    body: ({ product, amount, date, url }) => `Тестовая покупка подтверждена.\nПродукт: ${product}\nСумма: ${amount}\nДата покупки: ${date}\nОткрыть продукт: ${url}\n\nЭто тестовая покупка. Настоящие деньги не списывались. Документ не является бухгалтерской квитанцией.`,
  },
  en: {
    subject: "🧪 LapLapLa: Test purchase confirmed",
    body: ({ product, amount, date, url }) => `Your test purchase is confirmed.\nProduct: ${product}\nAmount: ${amount}\nPurchase date: ${date}\nOpen your product: ${url}\n\nThis is a test purchase. No real money was charged. The attached document is not an accounting receipt.`,
  },
  he: {
    subject: "🧪 LapLapLa: אישור רכישת ניסיון",
    body: ({ product, amount, date, url }) => `רכישת הניסיון אושרה.\nמוצר: ${product}\nסכום: ${amount}\nתאריך הרכישה: ${date}\nפתיחת המוצר: ${url}\n\nזוהי רכישת ניסיון בלבד. לא חויב כסף אמיתי. המסמך המצורף אינו קבלה לצורכי הנהלת חשבונות.`,
  },
};

function sandboxProductUrl(lang: Lang) {
  const configured = process.env.SANDBOX_PURCHASE_SITE_URL?.trim();
  const origin = configured || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) return null;
    return new URL(buildLocalizedPublicPath("/shop/sound-case-001/create", lang), parsed).toString();
  } catch {
    return null;
  }
}

export async function sendSandboxPurchaseEmailOnce(orderId: string): Promise<{ status: EmailStatus; code?: string }> {
  const db = createServerSupabaseClient({ serviceRole: true });
  const orderResult = await db.from("orders")
    .select("id,user_id,status,provider_environment,provider_capture_id,total_minor,currency,paid_at,customer_email_snapshot,order_items(product_id,product_title_snapshot,entitlement_id)")
    .eq("id", orderId).maybeSingle();
  if (orderResult.error) throw orderResult.error;
  const order = orderResult.data as unknown as OrderRow | null;
  if (!order || order.provider_environment !== "sandbox" || order.status !== "paid"
    || !order.provider_capture_id || !order.paid_at) return { status: "skipped", code: "not_paid_sandbox" };
  const item = Array.isArray(order.order_items) ? order.order_items[0] : order.order_items;
  if (!item?.entitlement_id || !item.product_title_snapshot) return { status: "skipped", code: "missing_product_access" };
  const entitlementResult = await db.from("product_entitlements").select("id")
    .eq("id", item.entitlement_id).eq("user_id", order.user_id)
    .eq("product_id", item.product_id).eq("status", "active").maybeSingle();
  if (entitlementResult.error) throw entitlementResult.error;
  if (!entitlementResult.data) return { status: "skipped", code: "access_not_active" };

  const deliveryResult = await db.from("sandbox_purchase_email_deliveries")
    .select("status,attempt_count").eq("order_id", orderId).maybeSingle();
  if (deliveryResult.error) throw deliveryResult.error;
  const delivery = deliveryResult.data as DeliveryRow | null;
  if (!delivery) return { status: "skipped", code: "not_registered" };
  if (delivery.status === "accepted") return { status: "already_accepted" };
  if (delivery.status === "sending" || delivery.status === "uncertain") return { status: "skipped", code: delivery.status };

  const token = randomUUID();
  const claimedAt = new Date().toISOString();
  const claim = await db.from("sandbox_purchase_email_deliveries")
    .update({ status: "sending", attempt_count: delivery.attempt_count + 1,
      claim_token: token, claimed_at: claimedAt, updated_at: claimedAt, error_code: null })
    .eq("order_id", orderId).eq("status", delivery.status).eq("attempt_count", delivery.attempt_count)
    .select("order_id").maybeSingle();
  if (claim.error) throw claim.error;
  if (!claim.data) return { status: "skipped", code: "already_claimed" };

  async function finish(status: "accepted" | "failed" | "uncertain", code?: string, providerEmailId?: string) {
    const completed = await db.from("sandbox_purchase_email_deliveries")
      .update({ status, provider_email_id: providerEmailId ?? null,
        accepted_at: status === "accepted" ? new Date().toISOString() : null,
        error_code: code ?? null, claim_token: null, updated_at: new Date().toISOString() })
      .eq("order_id", orderId).eq("status", "sending").eq("claim_token", token)
      .select("order_id").maybeSingle();
    if (completed.error || !completed.data) throw completed.error ?? new Error("email_delivery_evidence_update_failed");
  }

  const email = order.customer_email_snapshot;
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const consentResult = await db.from("checkout_consents").select("locale").eq("order_id", orderId).maybeSingle();
  const requestedLang = consentResult.data?.locale as Lang | undefined;
  const lang = requestedLang && copy[requestedLang] ? requestedLang : null;
  const url = lang ? sandboxProductUrl(lang) : null;
  if (consentResult.error || !email || !EMAIL_PATTERN.test(email) || !key || !from || !lang || !url) {
    await finish("failed", "delivery_configuration_incomplete");
    return { status: "failed", code: "delivery_configuration_incomplete" };
  }
  const localizedCopy = copy[lang];

  let pdf: Buffer;
  try {
    pdf = await renderSandboxPurchasePdf({ orderId, product: item.product_title_snapshot,
      amountMinor: order.total_minor, currency: order.currency, paidAt: order.paid_at });
    if (!pdf.length || pdf.length > MAX_PDF_BYTES) throw new Error("invalid_pdf_size");
  } catch {
    await finish("failed", "test_pdf_generation_failed");
    return { status: "failed", code: "test_pdf_generation_failed" };
  }

  let status: "accepted" | "failed" | "uncertain" = "uncertain";
  let code: string | undefined;
  let providerEmailId: string | undefined;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        "Idempotency-Key": `sandbox-purchase/${orderId}` },
      body: JSON.stringify({
        from, to: [email], subject: localizedCopy.subject,
        text: localizedCopy.body({ product: item.product_title_snapshot,
          amount: `${(order.total_minor / 100).toFixed(2)} ${order.currency}`,
          date: new Date(order.paid_at).toISOString(), url }),
        attachments: [{ filename: "laplapla-sandbox-test-document.pdf",
          content: pdf.toString("base64"), content_type: "application/pdf" }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      status = response.status === 429 || response.status >= 500 ? "uncertain" : "failed";
      code = `resend_${response.status}`;
    } else {
      const body = await response.json() as { id?: unknown };
      if (typeof body.id === "string" && body.id) {
        status = "accepted";
        providerEmailId = body.id;
      } else code = "invalid_provider_response";
    }
  } catch {
    code = "provider_response_unknown";
  }
  try {
    await finish(status, code, providerEmailId);
  } catch {
    // An accepted message may have lost its database response. Leave the claim
    // for manual review; the recovery job never resends a stale sending claim.
    return { status: "uncertain", code: "evidence_update_failed" };
  }
  return { status, code };
}

export async function recoverSandboxPurchaseEmails() {
  const db = createServerSupabaseClient({ serviceRole: true });
  const staleCutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const stale = await db.from("sandbox_purchase_email_deliveries")
    .update({ status: "uncertain", error_code: "claim_timed_out", updated_at: new Date().toISOString() })
    .eq("status", "sending").lt("claimed_at", staleCutoff);
  if (stale.error) throw stale.error;
  const candidates = await db.rpc("list_sandbox_purchase_email_recovery_candidates", { target_limit: 25 });
  if (candidates.error) throw candidates.error;
  const summary = { scanned: 0, accepted: 0, failed: 0, uncertain: 0, skipped: 0 };
  for (const row of (candidates.data ?? []) as { order_id: string }[]) {
    summary.scanned += 1;
    try {
      const result = await sendSandboxPurchaseEmailOnce(row.order_id);
      if (result.status === "accepted" || result.status === "already_accepted") summary.accepted += 1;
      else if (result.status === "failed") summary.failed += 1;
      else if (result.status === "uncertain") summary.uncertain += 1;
      else summary.skipped += 1;
    } catch { summary.failed += 1; }
  }
  return summary;
}
