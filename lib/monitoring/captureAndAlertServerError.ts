import * as Sentry from "@sentry/nextjs";
import { sendDiscordErrorAlert } from "@/lib/monitoring/discordAlert";
import { sentryEnvironment } from "@/sentry.shared";

type CaptureAndAlertContext = {
  route: string;
  method: string;
  runtime?: string;
  environment?: string;
  statusCode?: number | string | null;
  sentryUrl?: string;
};

export async function captureAndAlertServerError(
  error: unknown,
  context: CaptureAndAlertContext,
) {
  try {
    Sentry.captureException(error, {
      tags: {
        route: context.route || "api",
        method: context.method || "UNKNOWN",
        runtime: context.runtime || "server",
      },
    });
  } catch {
    // Keep server error flow unchanged if Sentry capture fails.
  }

  const statusCode = context.statusCode == null ? 500 : Number(context.statusCode);
  if (!Number.isFinite(statusCode) || statusCode < 500) {
    return;
  }

  await sendDiscordErrorAlert({
    title: error instanceof Error ? error.message : "Unknown server error",
    level: "error",
    route: context.route || "api",
    method: context.method || "UNKNOWN",
    runtime: context.runtime || "server",
    environment: context.environment || sentryEnvironment || process.env.NODE_ENV || "unknown",
    statusCode,
    sentryUrl: context.sentryUrl,
  });
}
