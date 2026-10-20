import type { Lang } from "@/i18n";
import type { SupportCategory } from "@/lib/support/types";

const CATEGORY_TITLES: Record<SupportCategory, string> = {
  refund: "🚨 LAPLAPLA | REFUND REQUEST",
  payment: "🚨 LAPLAPLA | PAYMENT / ACCESS PROBLEM",
  technical: "🛠 LAPLAPLA | TECHNICAL SUPPORT",
  question: "💬 LAPLAPLA | PRODUCT QUESTION",
  other: "📩 LAPLAPLA | CUSTOMER SUPPORT",
};

export type DiscordSupportInput = {
  kind: "created" | "review";
  id: string;
  category: SupportCategory;
  orderId: string | null;
  locale: Lang;
  createdAt: string;
  status: string;
  notificationStatus: string;
};

export type DiscordSupportResult =
  | { ok: true; status: "sent" }
  | { ok: false; status: "not-configured" | "failed" | "uncertain"; code: string };

export async function sendDiscordSupportNotification(input: DiscordSupportInput): Promise<DiscordSupportResult> {
  if (typeof window !== "undefined") return { ok: false, status: "not-configured", code: "server_only" };
  const webhook = process.env.DISCORD_SUPPORT_WEBHOOK_URL;
  if (!webhook) return { ok: false, status: "not-configured", code: "missing_webhook" };

  // Only server-owned, non-personal fields are accepted. Never pass the email,
  // message, product title, or a customer-supplied order reference here.
  const fields = [
    { name: "Category", value: input.category, inline: true },
    { name: "Request ID", value: input.id, inline: false },
    { name: "Language", value: input.locale, inline: true },
    { name: "Created", value: input.createdAt, inline: false },
    { name: "Status", value: input.status, inline: true },
    { name: "Email notification", value: input.notificationStatus, inline: true },
    ...(input.orderId ? [{ name: "Verified order ID", value: input.orderId, inline: false }] : []),
  ];
  try {
    const response = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: input.kind === "created" ? CATEGORY_TITLES[input.category] : "⚠️ LAPLAPLA | SUPPORT NOTIFICATION NEEDS REVIEW",
          color: input.kind === "created" ? 0x3498db : 0xffa500,
          fields,
          timestamp: input.createdAt,
        }],
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { ok: false, status: "failed", code: `http_${response.status}` };
    const body = await response.json().catch(() => null) as { id?: unknown } | null;
    if (!body || typeof body.id !== "string" || !body.id) {
      return { ok: false, status: "uncertain", code: "missing_message_id" };
    }
    return { ok: true, status: "sent" };
  } catch {
    return { ok: false, status: "uncertain", code: "network_error" };
  }
}
