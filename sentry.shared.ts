import * as Sentry from "@sentry/nextjs";
import type { Event } from "@sentry/core";

const ABORT_MESSAGES = [
  "AbortError",
  "The operation was aborted",
  "fetch aborted",
];

const NETWORK_NOISE_MESSAGES = [
  "NetworkError",
  "Failed to fetch",
  "Load failed",
];

const DEV_ONLY_MESSAGES = [
  "ResizeObserver loop limit exceeded",
  "Hydration failed",
];

const EXTENSION_PATTERNS = [
  "chrome-extension://",
  "moz-extension://",
];

const IGNORED_STATUS_CODES = new Set(["400", "401", "403", "404"]);

export const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || "development";

function getEventMessage(event: Event): string {
  return (
    event.message ||
    event.logentry?.message ||
    event.exception?.values?.[0]?.value ||
    ""
  );
}

function getStackFilenames(event: Event): string[] {
  return (
    event.exception?.values?.flatMap((exception) =>
      exception.stacktrace?.frames?.map((frame) => frame.filename || "") || [],
    ) || []
  );
}

function hasMatchingMessage(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

export function shouldIgnoreMonitoringNoise(params: {
  message: string;
  statusCode?: number | string | null;
  environment?: string | null;
}) {
  const message = params.message || "";
  const statusCode =
    params.statusCode == null ? null : String(params.statusCode);
  const environment = params.environment || "";

  if (hasMatchingMessage(message, ABORT_MESSAGES)) {
    return true;
  }

  if (hasMatchingMessage(message, NETWORK_NOISE_MESSAGES)) {
    return true;
  }

  if (statusCode && IGNORED_STATUS_CODES.has(statusCode)) {
    return true;
  }

  if (
    environment === "development" &&
    hasMatchingMessage(message, DEV_ONLY_MESSAGES)
  ) {
    return true;
  }

  return false;
}

function hasExtensionNoise(event: Event): boolean {
  const message = getEventMessage(event);
  const filenames = getStackFilenames(event);

  return EXTENSION_PATTERNS.some(
    (pattern) =>
      message.includes(pattern) ||
      filenames.some((filename) => filename.includes(pattern)),
  );
}

function getStatusCode(event: Event): string | null {
  const statusFromTags = event.tags?.statusCode;
  const statusFromExtra =
    typeof event.extra === "object" && event.extra !== null && "statusCode" in event.extra
      ? event.extra.statusCode
      : undefined;

  if (statusFromTags != null) {
    return String(statusFromTags);
  }

  if (statusFromExtra != null) {
    return String(statusFromExtra);
  }

  return null;
}

export function shouldIgnoreError(event: Event): boolean {
  const message = getEventMessage(event);
  const statusCode = getStatusCode(event);

  if (hasExtensionNoise(event)) {
    return true;
  }

  if (
    shouldIgnoreMonitoringNoise({
      message,
      statusCode,
      environment: event.environment,
    })
  ) {
    return true;
  }

  return false;
}

export function setSentryFeature(feature: string) {
  if (!feature) {
    return;
  }

  Sentry.setTag("feature", feature);
}

export function sentryDebugMessage(msg: string) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(msg);
}
