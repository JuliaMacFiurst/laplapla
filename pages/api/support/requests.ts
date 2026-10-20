import type { NextApiRequest, NextApiResponse } from "next";
import { extractCustomerBearerToken, resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { sendSupportNotification } from "@/lib/server/customerSupport";
import { notifySupportDiscordCreated, notifySupportDiscordReview } from "@/lib/server/supportDiscord";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import { isLang } from "@/lib/i18n/routing";
import { isSupportCategory } from "@/lib/support/types";
import { withApiHandler } from "@/utils/apiHandler";

const BODY_KEYS = new Set(["submissionId", "locale", "category", "email", "orderReference", "message", "website"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>\u0000-\u001f\u007f]+@[^\s@<>\u0000-\u001f\u007f]+\.[^\s@<>\u0000-\u001f\u007f]+$/u;
const ORDER_REFERENCE = /^[a-zA-Z0-9-]{1,80}$/;

export async function supportRequestHandler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (!enforceSameOrigin(req, res)) return;
  const body = req.body as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !BODY_KEYS.has(key))
    || typeof body.submissionId !== "string" || !UUID.test(body.submissionId)
    || !isLang(body.locale) || !isSupportCategory(body.category)
    || typeof body.message !== "string" || body.message.trim().length < 10 || body.message.length > 4000
    || /[\u0000]/u.test(body.message)
    || (body.website !== undefined && typeof body.website !== "string")) {
    res.status(400).json({ ok: false, code: "invalid_request" });
    return;
  }
  if (body.website) {
    res.status(202).json({ ok: true, status: "received" });
    return;
  }
  const suppliedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const reference = body.orderReference === undefined || body.orderReference === "" ? null : body.orderReference;
  if ((reference !== null && (typeof reference !== "string" || !ORDER_REFERENCE.test(reference)))
    || (body.email !== undefined && typeof body.email !== "string")) {
    res.status(400).json({ ok: false, code: "invalid_request" });
    return;
  }
  const access = await resolveCustomerAccess(req);
  if (extractCustomerBearerToken(req) && !access.isAuthenticated) {
    res.status(401).json({ ok: false, code: "session_expired" });
    return;
  }
  const email = access.isAuthenticated ? access.user.email?.trim().toLowerCase() ?? "" : suppliedEmail;
  if (email.length > 320 || !EMAIL.test(email)) {
    res.status(400).json({ ok: false, code: "invalid_email" });
    return;
  }
  const db = createServerSupabaseClient({ serviceRole: true });
  let productTitle: string | null = null;
  let orderId: string | null = null;
  if (access.isAuthenticated && reference) {
    const { data, error } = await db.from("orders")
      .select("id,order_items(product_title_snapshot)")
      .eq("id", reference).eq("user_id", access.user.id).neq("status", "creating")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(400).json({ ok: false, code: "invalid_request" });
      return;
    }
    orderId = data.id;
    const items = data.order_items as { product_title_snapshot: string | null }[] | { product_title_snapshot: string | null } | null;
    productTitle = Array.isArray(items) ? items[0]?.product_title_snapshot ?? null : items?.product_title_snapshot ?? null;
  }
  const { data: created, error: insertError } = await db.from("customer_support_requests")
    .insert({ submission_id: body.submissionId, customer_user_id: access.isAuthenticated ? access.user.id : null,
      email, locale: body.locale, category: body.category, message: body.message.trim(),
      order_reference: reference, order_id: orderId, product_title: productTitle })
    .select("id").single();
  if (insertError) {
    if (insertError.code !== "23505") throw insertError;
    const { data: existing, error } = await db.from("customer_support_requests")
      .select("id").eq("submission_id", body.submissionId).eq("email", email).maybeSingle();
    if (error) throw error;
    if (!existing) {
      res.status(409).json({ ok: false, code: "invalid_request" });
      return;
    }
    res.status(202).json({ ok: true, status: "received", requestId: existing.id });
    return;
  }
  const emailNotification = Promise.resolve().then(() => sendSupportNotification(created.id)).then(async (result) => {
    if (result === "failed" || result === "uncertain") {
      await notifySupportDiscordReview(created.id);
    }
  });
  // Both channels are independent. An error cannot undo the saved request or
  // prevent the other notification from running.
  await Promise.allSettled([
    Promise.resolve().then(() => notifySupportDiscordCreated(created.id)),
    emailNotification,
  ]);
  res.status(202).json({ ok: true, status: "received", requestId: created.id });
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };

export default withApiHandler({
  guard: { methods: ["POST"], limit: 3, windowMs: 10 * 60_000, maxBodyBytes: 8 * 1024, keyPrefix: "customer-support", failClosedOnDistributedLimitError: process.env.NODE_ENV === "production" },
}, supportRequestHandler);
