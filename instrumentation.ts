import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { sendDiscordErrorAlert } = await import("./lib/monitoring/discordAlert");
  const { sentryEnvironment } = await import("./sentry.shared");
  const eventId = Sentry.captureException(error, {
    tags: {
      route: context.routePath,
      method: request.method,
      runtime: process.env.NEXT_RUNTIME || "server",
      routeType: context.routeType,
    },
  });

  const requestId = request.headers["x-vercel-id"];
  const title = error instanceof Error ? error.message : "Unknown server error";
  console.error(JSON.stringify({
    level: "error",
    message: "Unhandled Next.js request error",
    route: request.path || context.routePath,
    method: request.method,
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
    sentryEventId: eventId,
    error: title,
  }));

  await sendDiscordErrorAlert({
    title,
    level: "error",
    route: request.path || context.routePath,
    method: request.method,
    runtime: process.env.NEXT_RUNTIME || "server",
    environment: sentryEnvironment || process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    statusCode: 500,
    eventId,
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
  });
};
