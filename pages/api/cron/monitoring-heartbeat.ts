import type { NextApiRequest, NextApiResponse } from "next";
import { sendDiscordErrorAlert } from "@/lib/monitoring/discordAlert";

type HeartbeatResponse =
  | { ok: true; status: string }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HeartbeatResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await sendDiscordErrorAlert({
    title: "Error monitoring and Discord delivery are operational",
    level: "info",
    route: "/api/cron/monitoring-heartbeat",
    method: "GET",
    runtime: "server",
    environment: process.env.VERCEL_ENV || process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "unknown",
    kind: "heartbeat",
    requestId: Array.isArray(req.headers["x-vercel-id"])
      ? req.headers["x-vercel-id"][0]
      : req.headers["x-vercel-id"],
  });

  if (!result.ok) {
    console.error(JSON.stringify({
      level: "error",
      message: "Monitoring heartbeat failed",
      status: result.status,
      error: result.error,
    }));
    res.status(502).json({ error: result.error });
    return;
  }

  res.status(200).json({ ok: true, status: result.status });
}
