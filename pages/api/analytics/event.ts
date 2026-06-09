import type { NextApiRequest, NextApiResponse } from "next";
import {
  isAnalyticsEntityType,
  isAnalyticsEventName,
  isAnalyticsLang,
  type AnalyticsMetadata,
} from "@/lib/analytics/events";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type AnalyticsEventResponse = { ok: true; status: "recorded" | "skipped" } | { error: string };

const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? truncate(normalized, maxLength) : null;
}

function readUuid(value: unknown) {
  const normalized = readString(value, 64);
  return normalized && UUID_PATTERN.test(normalized) ? normalized : null;
}

function sanitizeMetadata(value: unknown): AnalyticsMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const metadata: AnalyticsMetadata = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, 20)) {
    const normalizedKey = key.trim().replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, 60);
    if (!normalizedKey) {
      continue;
    }

    if (typeof rawValue === "string") {
      metadata[normalizedKey] = truncate(rawValue.trim(), 240);
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      metadata[normalizedKey] = rawValue;
    } else if (typeof rawValue === "boolean" || rawValue === null) {
      metadata[normalizedKey] = rawValue;
    }
  }

  return metadata;
}

async function readBody(req: NextApiRequest) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Analytics payload is too large");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "16kb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsEventResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    res.status(400).json({ error: "Invalid analytics payload" });
    return;
  }

  const payload = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const eventName = payload.eventName;
  if (!isAnalyticsEventName(eventName)) {
    res.status(400).json({ error: "Unknown analytics event" });
    return;
  }

  const entityType = payload.entityType;
  if (entityType != null && !isAnalyticsEntityType(entityType)) {
    res.status(400).json({ error: "Unknown analytics entity type" });
    return;
  }

  const lang = payload.lang;
  if (lang != null && !isAnalyticsLang(lang)) {
    res.status(400).json({ error: "Unknown analytics language" });
    return;
  }

  try {
    const supabase = createServerSupabaseClient({ serviceRole: true });
    const { error } = await supabase.from("analytics_events").insert({
      event_name: eventName,
      entity_type: entityType || null,
      entity_id: readString(payload.entityId, 160),
      entity_title: readString(payload.entityTitle, 240),
      page: readString(payload.page, 300),
      lang: lang || null,
      visitor_id: readUuid(payload.visitorId),
      session_id: readUuid(payload.sessionId),
      metadata: sanitizeMetadata(payload.metadata),
    });

    if (error) {
      throw error;
    }

    res.status(200).json({ ok: true, status: "recorded" });
  } catch (error) {
    console.warn("[analytics] failed to record event", error);
    res.status(200).json({ ok: true, status: "skipped" });
  }
}
