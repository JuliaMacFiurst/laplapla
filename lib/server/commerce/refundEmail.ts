import { randomUUID } from "node:crypto";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type Environment = "sandbox" | "live";
type DeliveryStatus = "pending" | "sending" | "accepted" | "failed" | "uncertain";
type Result = { status: "accepted" | "already_accepted" | "failed" | "uncertain" | "skipped"; code?: string };
type RefundRow = {
  id: string; order_id: string; entitlement_id: string; status: string;
  provider_environment: Environment; amount_minor: number; currency: string;
  provider_refund_id: string | null; provider_confirmed_at: string | null; access_revoked_at: string | null;
};
type OrderRow = {
  id: string; status: string; provider_environment: string | null; total_minor: number;
  currency: string; customer_email_snapshot: string | null;
  order_items: { entitlement_id: string | null; product_title_snapshot: string | null }
    | Array<{ entitlement_id: string | null; product_title_snapshot: string | null }> | null;
};
type DeliveryRow = { status: DeliveryStatus; attempt_count: number };

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
const MAX_ATTEMPTS = 2;
const PUBLIC_SUPPORT_ORIGIN = "https://www.laplapla.com";

const copy: Record<Lang, {
  liveSubject: string; sandboxSubject: string; product: string; amount: string;
  order: string; date: string; provider: string; access: string; support: string;
  liveIntro: string; liveTiming: string; sandboxIntro: string; sandboxNotice: string;
}> = {
  ru: {
    liveSubject: "LapLapLa: возврат средств подтверждён",
    sandboxSubject: "LapLapLa: тестовый возврат подтверждён",
    product: "Продукт", amount: "Сумма возврата", order: "Номер заказа", date: "Дата подтверждения",
    provider: "Возврат оформлен через PayPal.", access: "Доступ по этой покупке прекращён.",
    support: "Поддержка", liveIntro: "Полный возврат средств подтверждён.",
    liveTiming: "Срок зачисления зависит от PayPal и вашего банка. Это письмо не является бухгалтерским документом.",
    sandboxIntro: "Тестовый полный возврат подтверждён.",
    sandboxNotice: "TEST REFUND — реальные деньги не списывались и не возвращались. Это не бухгалтерский документ.",
  },
  en: {
    liveSubject: "LapLapLa: refund confirmed", sandboxSubject: "LapLapLa: test refund confirmed",
    product: "Product", amount: "Refund amount", order: "Order ID", date: "Confirmed at",
    provider: "The refund was processed through PayPal.", access: "Access from this purchase has ended.",
    support: "Support", liveIntro: "Your full refund is confirmed.",
    liveTiming: "The time for funds to appear depends on PayPal and your bank. This email is not an accounting document.",
    sandboxIntro: "Your full test refund is confirmed.",
    sandboxNotice: "TEST REFUND — no real money was charged or returned. This is not an accounting document.",
  },
  he: {
    liveSubject: "LapLapLa: ההחזר הכספי אושר", sandboxSubject: "LapLapLa: החזר ניסיוני אושר",
    product: "מוצר", amount: "סכום ההחזר", order: "מספר הזמנה", date: "מועד אישור ההחזר",
    provider: "ההחזר בוצע באמצעות PayPal.", access: "הגישה שניתנה במסגרת רכישה זו בוטלה.",
    support: "תמיכה", liveIntro: "ההחזר המלא אושר.",
    liveTiming: "מועד הופעת הכספים בחשבון תלוי ב-PayPal ובבנק. הודעה זו אינה מסמך חשבונאי.",
    sandboxIntro: "החזר הניסיון המלא אושר.",
    sandboxNotice: "TEST REFUND — לא נגבה ולא הוחזר כסף אמיתי. זה אינו מסמך חשבונאי.",
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

export function buildRefundEmail(input: {
  environment: Environment; lang: Lang; product: string; amountMinor: number;
  currency: string; orderId: string; confirmedAt: string;
}) {
  const words = copy[input.lang];
  const sandbox = input.environment === "sandbox";
  const amount = `${(input.amountMinor / 100).toFixed(2)} ${input.currency}`;
  const date = new Date(input.confirmedAt).toISOString();
  const supportUrl = new URL(buildLocalizedPublicPath("/support", input.lang), PUBLIC_SUPPORT_ORIGIN).toString();
  const intro = sandbox ? words.sandboxIntro : words.liveIntro;
  const notice = sandbox ? words.sandboxNotice : words.liveTiming;
  const subject = sandbox ? words.sandboxSubject : words.liveSubject;
  const text = [intro, `${words.product}: ${input.product}`, `${words.amount}: ${amount}`,
    `${words.order}: ${input.orderId}`, `${words.date}: ${date}`, words.provider,
    words.access, notice, `${words.support}: ${supportUrl}`].join("\n");
  const dir = input.lang === "he" ? "rtl" : "ltr";
  const field = (label: string, value: string) => `<p>${escapeHtml(label)}: <bdi dir="ltr">${escapeHtml(value)}</bdi></p>`;
  const html = `<div lang="${input.lang}" dir="${dir}" style="direction:${dir};text-align:${input.lang === "he" ? "right" : "left"}">`
    + `<p>${escapeHtml(intro)}</p><p>${escapeHtml(words.product)}: ${escapeHtml(input.product)}</p>`
    + field(words.amount, amount) + field(words.order, input.orderId) + field(words.date, date)
    + `<p>${escapeHtml(words.provider)}</p><p>${escapeHtml(words.access)}</p><p>${escapeHtml(notice)}</p>`
    + `<p>${escapeHtml(words.support)}: <a href="${escapeHtml(supportUrl)}">${escapeHtml(supportUrl)}</a></p></div>`;
  return { subject, text, html };
}

export async function sendRefundEmailOnce(operationId: string): Promise<Result> {
  if (process.env.REFUND_EMAIL_ENABLED !== "true") return { status: "skipped", code: "disabled" };
  const db = createServerSupabaseClient({ serviceRole: true });
  const operationResult = await db.from("commerce_refund_operations")
    .select("id,order_id,entitlement_id,status,provider_environment,amount_minor,currency,provider_refund_id,provider_confirmed_at,access_revoked_at")
    .eq("id", operationId).maybeSingle();
  if (operationResult.error) throw operationResult.error;
  const operation = operationResult.data as RefundRow | null;
  if (!operation || operation.status !== "completed" || !operation.provider_refund_id
    || !operation.provider_confirmed_at || !operation.access_revoked_at
    || !["sandbox", "live"].includes(operation.provider_environment)) {
    return { status: "skipped", code: "refund_not_completed" };
  }

  const deliveryResult = await db.from("commerce_refund_email_deliveries")
    .select("status,attempt_count").eq("operation_id", operationId).maybeSingle();
  if (deliveryResult.error) throw deliveryResult.error;
  const delivery = deliveryResult.data as DeliveryRow | null;
  if (!delivery) return { status: "skipped", code: "not_registered" };
  if (delivery.status === "accepted") return { status: "already_accepted" };
  if (delivery.status === "sending" || delivery.status === "uncertain" || delivery.attempt_count >= MAX_ATTEMPTS) {
    return { status: "skipped", code: delivery.status === "failed" ? "manual_review" : delivery.status };
  }

  const token = randomUUID();
  const claimedAt = new Date().toISOString();
  const claim = await db.from("commerce_refund_email_deliveries")
    .update({ status: "sending", attempt_count: delivery.attempt_count + 1,
      claim_token: token, claimed_at: claimedAt, updated_at: claimedAt, error_code: null })
    .eq("operation_id", operationId).eq("status", delivery.status).eq("attempt_count", delivery.attempt_count)
    .select("operation_id").maybeSingle();
  if (claim.error) throw claim.error;
  if (!claim.data) return { status: "skipped", code: "already_claimed" };

  async function finish(status: "accepted" | "failed" | "uncertain", code?: string, providerId?: string) {
    const result = await db.from("commerce_refund_email_deliveries")
      .update({ status, provider_email_id: providerId ?? null, error_code: code ?? null,
        accepted_at: status === "accepted" ? new Date().toISOString() : null,
        claim_token: null, updated_at: new Date().toISOString() })
      .eq("operation_id", operationId).eq("status", "sending").eq("claim_token", token)
      .select("operation_id").maybeSingle();
    if (result.error || !result.data) throw result.error ?? new Error("refund_email_evidence_update_failed");
  }

  const [orderResult, consentResult] = await Promise.all([
    db.from("orders").select("id,status,provider_environment,total_minor,currency,customer_email_snapshot,order_items(entitlement_id,product_title_snapshot)")
      .eq("id", operation.order_id).maybeSingle(),
    db.from("checkout_consents").select("locale").eq("order_id", operation.order_id).maybeSingle(),
  ]);
  const order = orderResult.data as OrderRow | null;
  const item = Array.isArray(order?.order_items) ? order.order_items[0] : order?.order_items;
  const lang = consentResult.data?.locale as Lang | undefined;
  const email = order?.customer_email_snapshot;
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (orderResult.error || consentResult.error || !order || order.status !== "paid"
    || order.provider_environment !== operation.provider_environment
    || order.total_minor !== operation.amount_minor || order.currency !== operation.currency
    || item?.entitlement_id !== operation.entitlement_id || !item?.product_title_snapshot
    || !email || !EMAIL_PATTERN.test(email) || !lang || !copy[lang] || !key || !from) {
    await finish("failed", "refund_email_configuration_or_evidence_mismatch");
    return { status: "failed", code: "refund_email_configuration_or_evidence_mismatch" };
  }

  const message = buildRefundEmail({ environment: operation.provider_environment, lang,
    product: item.product_title_snapshot, amountMinor: operation.amount_minor,
    currency: operation.currency, orderId: operation.order_id, confirmedAt: operation.provider_confirmed_at });
  let status: "accepted" | "failed" | "uncertain" = "uncertain";
  let code: string | undefined;
  let providerId: string | undefined;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json",
        "Idempotency-Key": `refund-confirmation/${operationId}` },
      body: JSON.stringify({ from, to: [email], ...message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      status = response.status === 429 || response.status >= 500 ? "uncertain" : "failed";
      code = `resend_${response.status}`;
    } else {
      const body = await response.json() as { id?: unknown };
      if (typeof body.id === "string" && body.id) {
        status = "accepted";
        providerId = body.id;
      } else code = "invalid_provider_response";
    }
  } catch {
    code = "provider_response_unknown";
  }
  try { await finish(status, code, providerId); }
  catch { return { status: "uncertain", code: "evidence_update_failed" }; }
  return { status, code };
}

export async function recoverRefundEmails() {
  if (process.env.REFUND_EMAIL_ENABLED !== "true") return null;
  const db = createServerSupabaseClient({ serviceRole: true });
  const staleCutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const stale = await db.from("commerce_refund_email_deliveries")
    .update({ status: "uncertain", error_code: "claim_timed_out", claim_token: null,
      updated_at: new Date().toISOString() })
    .eq("status", "sending").lt("claimed_at", staleCutoff);
  if (stale.error) throw stale.error;
  const candidates = await db.from("commerce_refund_email_deliveries")
    .select("operation_id").in("status", ["pending", "failed"])
    .lt("attempt_count", MAX_ATTEMPTS).order("created_at", { ascending: true }).limit(25);
  if (candidates.error) throw candidates.error;
  const summary = { scanned: 0, accepted: 0, failed: 0, uncertain: 0, skipped: 0 };
  for (const row of candidates.data ?? []) {
    summary.scanned += 1;
    try {
      const result = await sendRefundEmailOnce(row.operation_id);
      if (result.status === "accepted" || result.status === "already_accepted") summary.accepted += 1;
      else if (result.status === "failed") summary.failed += 1;
      else if (result.status === "uncertain") summary.uncertain += 1;
      else summary.skipped += 1;
    } catch { summary.failed += 1; }
  }
  return summary;
}
