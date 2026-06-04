import { shouldIgnoreMonitoringNoise } from "../../sentry.shared";

type UnknownRecord = Record<string, unknown>;

type DiscordEmbedField = {
  name: string;
  value: string;
  inline: boolean;
};

type DiscordEmbed = {
  title: string;
  color: number;
  fields: DiscordEmbedField[];
  url?: string;
  timestamp: string;
};

export type DiscordAlertInput = {
  title: string;
  level: string;
  route: string;
  method: string;
  runtime: string;
  environment: string;
  kind?: "error" | "heartbeat";
  eventId?: string;
  requestId?: string;
  sentryUrl?: string;
  vercelUrl?: string;
  statusCode?: number | string | null;
};

export type DiscordAlertResult =
  | { ok: true; status: "sent" | "throttled" | "ignored" }
  | { ok: false; status: "not-configured" | "wrong-environment" | "discord-error"; error: string };

const DISCORD_CONTENT_LIMIT = 2000;
const DISCORD_FIELD_LIMIT = 1024;
const TITLE_LIMIT = 200;
const THROTTLE_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_SENTRY_ISSUES_URL = "https://sentry.io/issues/";
const DEFAULT_VERCEL_LOGS_URL =
  "https://vercel.com/juliamacfiursts-projects/laplapla/logs";

const recentAlerts = new Map<string, number>();

if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.DISCORD_WEBHOOK_URL
) {
  console.error("Missing DISCORD_WEBHOOK_URL in production");
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = readString(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function sanitizeInline(value: string | null): string {
  if (!value) {
    return "unknown";
  }

  return value.replace(/[`<>]/g, "").replace(/\s+/g, " ").trim() || "unknown";
}

function formatFieldValue(value: string): string {
  return truncate(value || "unknown", DISCORD_FIELD_LIMIT);
}

function getColor(level: string): number {
  switch (level) {
    case "fatal":
      return 0x8b0000;
    case "error":
      return 0xff0000;
    case "warning":
      return 0xffa500;
    case "info":
      return 0x3498db;
    default:
      return 0x808080;
  }
}

function buildSentryUrl(eventId: string | null): string | null {
  const configuredUrl = readString(process.env.SENTRY_ISSUES_URL);
  if (configuredUrl) {
    return eventId
      ? `${configuredUrl}${configuredUrl.includes("?") ? "&" : "?"}query=${encodeURIComponent(eventId)}`
      : configuredUrl;
  }

  const org = readString(process.env.SENTRY_ORG);
  if (!org) {
    return eventId
      ? `${DEFAULT_SENTRY_ISSUES_URL}?query=${encodeURIComponent(eventId)}`
      : DEFAULT_SENTRY_ISSUES_URL;
  }

  const baseUrl = `https://sentry.io/organizations/${encodeURIComponent(org)}/issues/`;
  return eventId ? `${baseUrl}?query=${encodeURIComponent(eventId)}` : baseUrl;
}

function buildVercelUrl(): string | null {
  const configuredUrl = readString(process.env.VERCEL_PROJECT_DASHBOARD_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  return DEFAULT_VERCEL_LOGS_URL;
}

function normalizeDetails(input: DiscordAlertInput): Required<Omit<DiscordAlertInput, "statusCode">> & {
  statusCode: string | null;
} {
  const eventId = sanitizeInline(input.eventId || "unknown");
  const sentryUrl = pickString(input.sentryUrl, buildSentryUrl(eventId === "unknown" ? null : eventId));

  return {
    title: truncate(sanitizeInline(input.title || "unknown"), TITLE_LIMIT),
    level: sanitizeInline(input.level || "unknown"),
    route: sanitizeInline(input.route || "unknown"),
    method: sanitizeInline(input.method || "unknown"),
    runtime: sanitizeInline(input.runtime || "unknown"),
    environment: sanitizeInline(input.environment || "unknown"),
    kind: input.kind || "error",
    eventId,
    requestId: sanitizeInline(input.requestId || "unknown"),
    sentryUrl: sanitizeInline(sentryUrl || "unknown"),
    vercelUrl: sanitizeInline(input.vercelUrl || buildVercelUrl() || "unknown"),
    statusCode: input.statusCode == null ? null : String(input.statusCode),
  };
}

function buildAiBlock(details: ReturnType<typeof normalizeDetails>): string {
  const block = [
    details.kind === "heartbeat"
      ? "Monitoring heartbeat is healthy"
      : "New production error detected",
    "",
    "=== SENTRY ALERT ===",
    `TITLE: ${details.title}`,
    `LEVEL: ${details.level}`,
    `ROUTE: ${details.route}`,
    `METHOD: ${details.method}`,
    `RUNTIME: ${details.runtime}`,
    `ENV: ${details.environment}`,
    `SENTRY: ${details.sentryUrl}`,
    `VERCEL: ${details.vercelUrl}`,
    "=== END ===",
  ].join("\n");

  return truncate(block, DISCORD_CONTENT_LIMIT);
}

function buildEmbed(details: ReturnType<typeof normalizeDetails>): DiscordEmbed {
  const fields: DiscordEmbedField[] = [
    {
      name: "📍 Route",
      value: formatFieldValue(details.route),
      inline: true,
    },
    {
      name: "⚙️ Method",
      value: formatFieldValue(details.method),
      inline: true,
    },
    {
      name: "🌍 Environment",
      value: formatFieldValue(details.environment),
      inline: true,
    },
    {
      name: details.kind === "heartbeat" ? "Status" : "Error",
      value: formatFieldValue(details.title),
      inline: false,
    },
  ];

  if (details.statusCode) {
    fields.push({
      name: "Status",
      value: formatFieldValue(details.statusCode),
      inline: true,
    });
  }

  if (details.eventId !== "unknown") {
    fields.push({
      name: "Sentry Event ID",
      value: formatFieldValue(details.eventId),
      inline: false,
    });
  }

  if (details.requestId !== "unknown") {
    fields.push({
      name: "Request ID",
      value: formatFieldValue(details.requestId),
      inline: false,
    });
  }

  if (details.sentryUrl !== "unknown") {
    fields.push({
      name: "🔗 Open in Sentry",
      value: formatFieldValue(`[View Issue](${details.sentryUrl})`),
      inline: false,
    });
  }

  if (details.vercelUrl !== "unknown") {
    fields.push({
      name: "Open in Vercel",
      value: formatFieldValue(`[View runtime details](${details.vercelUrl})`),
      inline: false,
    });
  }

  return {
    title: details.kind === "heartbeat" ? "Monitoring heartbeat" : "New Error",
    color: getColor(details.level),
    fields,
    url: details.sentryUrl !== "unknown" ? details.sentryUrl : undefined,
    timestamp: new Date().toISOString(),
  };
}

function getThrottleKey(details: ReturnType<typeof normalizeDetails>): string {
  return `${details.route}::${details.title}`;
}

function shouldThrottle(details: ReturnType<typeof normalizeDetails>): boolean {
  const now = Date.now();
  const key = getThrottleKey(details);

  for (const [existingKey, timestamp] of recentAlerts) {
    if (now - timestamp > THROTTLE_WINDOW_MS) {
      recentAlerts.delete(existingKey);
    }
  }

  const lastSentAt = recentAlerts.get(key);
  if (lastSentAt && now - lastSentAt < THROTTLE_WINDOW_MS) {
    return true;
  }

  return false;
}

function markAlertSent(details: ReturnType<typeof normalizeDetails>) {
  recentAlerts.set(getThrottleKey(details), Date.now());
}

export async function sendDiscordErrorAlert(input: DiscordAlertInput): Promise<DiscordAlertResult> {
  if (typeof window !== "undefined") {
    return { ok: false, status: "not-configured", error: "Discord alerts are server-only" };
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return { ok: false, status: "not-configured", error: "DISCORD_WEBHOOK_URL is missing" };
  }

  const details = normalizeDetails(input);

  if (details.environment.toLowerCase() !== "production") {
    return { ok: false, status: "wrong-environment", error: `Environment is ${details.environment}` };
  }

  if (
    details.kind !== "heartbeat" &&
    shouldIgnoreMonitoringNoise({
      message: details.title,
      statusCode: details.statusCode,
      environment: details.environment,
    })
  ) {
    return { ok: true, status: "ignored" };
  }

  if (shouldThrottle(details)) {
    return { ok: true, status: "throttled" };
  }

  try {
    const response = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: buildAiBlock(details),
        embeds: [buildEmbed(details)],
        allowed_mentions: {
          parse: [],
        },
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      const message = `Discord returned ${response.status}: ${truncate(responseText, 500)}`;
      console.error("Discord webhook error:", {
        status: response.status,
        body: truncate(responseText, 500),
      });
      return { ok: false, status: "discord-error", error: message };
    }
    markAlertSent(details);
    return { ok: true, status: "sent" };
  } catch (error) {
    console.error("Discord webhook error:", error);
    return {
      ok: false,
      status: "discord-error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getPrimaryPayload(body: unknown): UnknownRecord | null {
  const root = asRecord(body);
  if (!root) {
    return null;
  }

  const data = asRecord(root.data);
  const issue = asRecord(root.issue);
  const event = asRecord(root.event);

  return data || issue || event || root;
}

function getTagValue(payload: UnknownRecord | null, key: string): string | null {
  if (!payload) {
    return null;
  }

  const tags = asRecord(payload.tags);
  if (tags && key in tags) {
    return readString(tags[key]);
  }

  const entries = Array.isArray(payload.tags) ? payload.tags : [];
  for (const entry of entries) {
    const record = asRecord(entry);
    if (!record) {
      continue;
    }

    const tagKey = pickString(record.key, record.name);
    if (tagKey === key) {
      return pickString(record.value);
    }
  }

  return null;
}

function extractTitle(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      payload?.title,
      payload?.message,
      payload?.culprit,
      payload?.type,
      root?.title,
      root?.message,
      root?.action,
    ),
  );
}

function extractLevel(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      payload?.level,
      getTagValue(payload, "level"),
      root?.level,
      "error",
    ),
  );
}

function extractRoute(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      getTagValue(payload, "route"),
      payload?.route,
      root?.route,
    ),
  );
}

function extractMethod(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      getTagValue(payload, "method"),
      payload?.method,
      root?.method,
    ),
  );
}

function extractEnvironment(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      payload?.environment,
      getTagValue(payload, "environment"),
      root?.environment,
      process.env.SENTRY_ENVIRONMENT,
      process.env.NODE_ENV,
      "production",
    ),
  );
}

function extractRuntime(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      getTagValue(payload, "runtime"),
      payload?.runtime,
      root?.runtime,
    ),
  );
}

function extractLink(body: unknown, payload: UnknownRecord | null): string {
  const root = asRecord(body);

  return sanitizeInline(
    pickString(
      payload?.web_url,
      payload?.url,
      payload?.permalink,
      root?.web_url,
      root?.url,
      root?.link,
      root?.issue_url,
    ),
  );
}

export function getDiscordAlertInputFromSentryPayload(body: unknown): DiscordAlertInput {
  const payload = getPrimaryPayload(body);

  return {
    title: extractTitle(body, payload) || "unknown",
    level: extractLevel(body, payload) || "error",
    route: extractRoute(body, payload) || "unknown",
    method: extractMethod(body, payload) || "unknown",
    runtime: extractRuntime(body, payload) || "unknown",
    environment: extractEnvironment(body, payload) || "unknown",
    sentryUrl: extractLink(body, payload) || "unknown",
  };
}
