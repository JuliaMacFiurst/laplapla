import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/utils/apiHandler";
import { getDiscordAlertInputFromSentryPayload, sendDiscordErrorAlert } from "@/lib/monitoring/discordAlert";

type AlertDiscordResponse = { ok: true } | { error: string };

const ALERT_SECRET_HEADER = "x-alert-secret";

function normalizeHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AlertDiscordResponse>,
) {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.DISCORD_ALERT_SECRET) {
      console.error("DISCORD_ALERT_SECRET is required in production");
      res.status(500).end();
      return;
    }

    const receivedSecret = normalizeHeaderValue(req.headers[ALERT_SECRET_HEADER]);
    if (receivedSecret !== process.env.DISCORD_ALERT_SECRET) {
      res.status(401).end();
      return;
    }
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.error("Missing DISCORD_WEBHOOK_URL");
    res.status(500).json({ error: "Webhook is not configured" });
    return;
  }

  const expectedSecret = process.env.DISCORD_ALERT_SECRET;
  if (process.env.NODE_ENV !== "production" && expectedSecret) {
    const receivedSecret = normalizeHeaderValue(req.headers[ALERT_SECRET_HEADER]);
    if (receivedSecret !== expectedSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  await sendDiscordErrorAlert(getDiscordAlertInputFromSentryPayload(req.body));

  res.status(200).json({ ok: true });
}

export default withApiHandler<AlertDiscordResponse>(
  {
    guard: {
      methods: ["POST"],
      maxBodyBytes: 1024 * 256,
      keyPrefix: "alert-discord",
    },
  },
  handler,
);
