import * as Sentry from "@sentry/nextjs";
import type { Breadcrumb, Event } from "@sentry/core";

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
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|token|secret|password|passwd|api[_-]?key|webhook|email|request[_-]?body/i;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function scrubString(value: string) {
  return value
    .replace(BEARER_PATTERN, "Bearer [FILTERED]")
    .replace(JWT_PATTERN, "[FILTERED_TOKEN]")
    .replace(EMAIL_PATTERN, "[FILTERED_EMAIL]");
}

function scrubUnknown(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return "[FILTERED_DEPTH]";
  }

  if (typeof value === "string") {
    return scrubString(value).slice(0, 2_000);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => scrubUnknown(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 100)
        .map(([key, nestedValue]) => [
          key,
          SENSITIVE_KEY_PATTERN.test(key)
            ? "[FILTERED]"
            : scrubUnknown(nestedValue, depth + 1),
        ]),
    );
  }

  return value;
}

function stripSensitiveQuery(urlValue: string | undefined) {
  if (!urlValue) {
    return urlValue;
  }

  try {
    const url = new URL(urlValue, "https://www.laplapla.com");
    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        url.searchParams.set(key, "[FILTERED]");
      }
    }
    if (SENSITIVE_KEY_PATTERN.test(url.hash)) {
      url.hash = "";
    }
    return urlValue.startsWith("http")
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return scrubString(urlValue);
  }
}

export function scrubSentryEvent<T extends Event>(event: T): T {
  const scrubbed = scrubUnknown(event) as T;
  if (scrubbed.request) {
    delete scrubbed.request.headers;
    delete scrubbed.request.cookies;
    delete scrubbed.request.data;
    scrubbed.request.url = stripSensitiveQuery(scrubbed.request.url);
    scrubbed.request.query_string = "[FILTERED]";
  }
  return scrubbed;
}

export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return scrubUnknown(breadcrumb) as Breadcrumb;
}

export const sentryEnvironment =
  process.env.SENTRY_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  "development";

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
