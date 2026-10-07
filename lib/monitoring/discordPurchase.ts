export type DiscordPurchaseInput = {
  notificationId: string;
  orderId: string;
  product: string;
  amountMinor: number;
  currency: string;
  provider: string;
  paidAt: string;
  priceSource: string;
};

export type DiscordPurchaseResult =
  | { ok: true; status: "sent"; messageId: string }
  | { ok: false; status: "not-configured" | "discord-error"; code: string };

const MAX_FIELD_LENGTH = 1024;

function safeField(value: string) {
  const normalized = value.replace(/[`<>]/gu, "").replace(/\s+/gu, " ").trim();
  return (normalized || "unknown").slice(0, MAX_FIELD_LENGTH);
}

function formatAmount(amountMinor: number, currency: string) {
  const amount = (amountMinor / 100).toFixed(2);
  return currency === "ILS" ? `${amount} ₪` : `${amount} ${currency}`;
}

export async function sendDiscordPurchaseNotification(
  input: DiscordPurchaseInput,
): Promise<DiscordPurchaseResult> {
  if (typeof window !== "undefined") {
    return { ok: false, status: "not-configured", code: "server_only" };
  }
  const webhook = process.env.DISCORD_PURCHASES_WEBHOOK_URL;
  if (!webhook) {
    return { ok: false, status: "not-configured", code: "missing_webhook" };
  }

  try {
    const response = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "💰 New LapLapLa purchase",
          color: 0x2ecc71,
          fields: [
            { name: "Product", value: safeField(input.product), inline: false },
            { name: "Amount", value: safeField(formatAmount(input.amountMinor, input.currency)), inline: true },
            { name: "Payment", value: safeField(input.provider === "paypal" ? "PayPal" : input.provider), inline: true },
            { name: "Environment", value: "Live", inline: true },
            { name: "Price", value: safeField(input.priceSource), inline: true },
            { name: "Order", value: safeField(input.orderId), inline: false },
            { name: "Time", value: safeField(input.paidAt), inline: false },
          ],
          footer: { text: `Notification ${safeField(input.notificationId)}` },
          timestamp: input.paidAt,
        }],
        allowed_mentions: { parse: [] },
      }),
    });
    if (!response.ok) return { ok: false, status: "discord-error", code: `http_${response.status}` };
    const body = await response.json().catch(() => null) as { id?: unknown } | null;
    if (!body || typeof body.id !== "string" || !body.id) {
      return { ok: false, status: "discord-error", code: "missing_message_id" };
    }
    return { ok: true, status: "sent", messageId: body.id };
  } catch {
    return { ok: false, status: "discord-error", code: "network_error" };
  }
}
