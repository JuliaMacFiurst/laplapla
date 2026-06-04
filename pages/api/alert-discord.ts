import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";
import { getDiscordAlertInputFromSentryPayload, sendDiscordErrorAlert } from "@/lib/monitoring/discordAlert";
import { verifySentryWebhookSignature } from "@/lib/monitoring/sentryWebhookAuth";

type AlertDiscordResponse = { ok: true; status: string } | { error: string };

const ALERT_SECRET_HEADER = "x-alert-secret";
const SENTRY_SIGNATURE_HEADER = "sentry-hook-signature";
const MAX_BODY_BYTES = 1024 * 256;

export const config = {
  api: {
    bodyParser: false,
  },
};

function normalizeHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body is too large");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AlertDiscordResponse>,
) {
  const rawBody = await readRawBody(req);
  const receivedAlertSecret = normalizeHeaderValue(req.headers[ALERT_SECRET_HEADER]);
  const sentrySignature = normalizeHeaderValue(req.headers[SENTRY_SIGNATURE_HEADER]);
  const hasValidAlertSecret = Boolean(
    process.env.DISCORD_ALERT_SECRET &&
    receivedAlertSecret === process.env.DISCORD_ALERT_SECRET,
  );
  const hasValidSentrySignature = verifySentryWebhookSignature(
    rawBody,
    sentrySignature,
    process.env.SENTRY_WEBHOOK_SECRET,
  );

  if (!hasValidAlertSecret && !hasValidSentrySignature) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.error("Missing DISCORD_WEBHOOK_URL");
    res.status(500).json({ error: "Webhook is not configured" });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const result = await sendDiscordErrorAlert(getDiscordAlertInputFromSentryPayload(body));

  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }

  res.status(200).json({ ok: true, status: result.status });
}

export default withApiHandler<AlertDiscordResponse>(
  {
    guard: {
      methods: ["POST"],
      maxBodyBytes: MAX_BODY_BYTES,
      keyPrefix: "alert-discord",
    },
  },
  handler,
);
