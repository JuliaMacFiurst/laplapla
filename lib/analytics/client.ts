import type {
  AnalyticsEventInput,
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics/events";

const VISITOR_STORAGE_KEY = "laplapla_analytics_visitor_id";
const LEGACY_SESSION_STORAGE_KEY = "laplapla_analytics_session_id";
const SESSION_STORAGE_KEY = "laplapla_analytics_session_v2";
const SESSION_STARTED_KEY = "laplapla_analytics_session_started_v2";
const RETRY_QUEUE_STORAGE_KEY = "laplapla_analytics_retry_queue";
const PROGRESS_CACHE_KEY = "__laplaplaProgressEvents";
const ACTIVE_CONTENT_STATE_KEY = "__laplaplaActiveContentState";
const PROGRESS_THROTTLE_MS = 15_000;
const PROGRESS_STEP = 10;
const MAX_RETRY_QUEUE_SIZE = 20;
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

type AnalyticsTrackInput =
  | AnalyticsEventInput
  | [eventName: AnalyticsEventName, properties?: AnalyticsProperties];

type AnalyticsIds = {
  anonymousUserId: string | null;
  sessionId: string | null;
  isNewSession: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type AnalyticsDeliveryStatus = "recorded" | "duplicate" | "skipped";

declare global {
  interface Window {
    [PROGRESS_CACHE_KEY]?: Map<string, { at: number; percent: number }>;
    [ACTIVE_CONTENT_STATE_KEY]?: AnalyticsProperties;
    __laplaplaRecordAnalyticsDebug?: (input: {
      id: string;
      eventName: string;
      route: string;
    }) => void;
    __laplaplaCompleteAnalyticsDebug?: (input: {
      id: string;
      status: "sent" | "failed";
      responseStatus?: number | null;
      durationMs?: number | null;
      errorMessage?: string | null;
    }) => void;
  }
}

export function createAnalyticsId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const next = char === "x" ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function createDebugId() {
  return `analytics_${createAnalyticsId()}`;
}

export function resolveAnalyticsVisitor(storage: StorageLike, createId: () => string = createAnalyticsId) {
  const existing = storage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;
  const next = createId();
  storage.setItem(VISITOR_STORAGE_KEY, next);
  return next;
}

export function resolveAnalyticsSession(
  storage: StorageLike,
  now = Date.now(),
  createId: () => string = createAnalyticsId,
  legacySessionId: string | null = null,
) {
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as { id?: unknown; lastActivityAt?: unknown } : null;
    const existingId = typeof parsed?.id === "string" ? parsed.id : null;
    const lastActivityAt = typeof parsed?.lastActivityAt === "number" ? parsed.lastActivityAt : null;
    const isActive = Boolean(
      existingId &&
      lastActivityAt != null &&
      now >= lastActivityAt &&
      now - lastActivityAt <= SESSION_INACTIVITY_MS,
    );
    const id = isActive ? existingId as string : legacySessionId || createId();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ id, lastActivityAt: now }));
    return { id, isNew: !isActive };
  } catch {
    return { id: legacySessionId || createId(), isNew: true };
  }
}

function getAnalyticsIds(): AnalyticsIds {
  if (typeof window === "undefined") {
    return { anonymousUserId: null, sessionId: null, isNewSession: false };
  }

  try {
    const existingV2Session = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const legacySessionId = existingV2Session
      ? null
      : window.sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
    const session = resolveAnalyticsSession(window.localStorage, Date.now(), createAnalyticsId, legacySessionId);
    return {
      anonymousUserId: resolveAnalyticsVisitor(window.localStorage),
      sessionId: session.id,
      isNewSession: session.isNew,
    };
  } catch {
    return { anonymousUserId: null, sessionId: null, isNewSession: false };
  }
}

function getDeviceType(): AnalyticsProperties["device_type"] {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const width = window.innerWidth || 0;
  if (width <= 767) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function getCurrentPage() {
  if (typeof window === "undefined") {
    return null;
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function getAnalyticsSkipReason(input: {
  nodeEnv?: string;
  vercelEnv?: string;
  hostname?: string;
  pathname?: string;
  optedOut?: boolean;
  automated?: boolean;
}) {
  if (input.optedOut) return "opted_out";
  if (input.automated) return "automated_browser";
  if (input.nodeEnv !== "production") return "non_production_build";
  if (input.vercelEnv && input.vercelEnv !== "production") return "vercel_preview";
  const hostname = (input.hostname || "").toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return "local_host";
  if (hostname.endsWith(".vercel.app")) return "vercel_preview_host";
  const pathname = input.pathname || "/";
  if (
    pathname === "/internal" || pathname.startsWith("/internal/") ||
    pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname === "/admin-login" || pathname.startsWith("/admin-login/") ||
    pathname === "/auth/callback" || pathname.startsWith("/auth/callback/")
  ) return "technical_route";
  return null;
}

function shouldSkipAnalytics() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("analytics_opt_out") === "1") {
      window.localStorage.setItem("laplapla_analytics_opt_out", "1");
      return true;
    }

    return getAnalyticsSkipReason({
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      optedOut: window.localStorage.getItem("laplapla_analytics_opt_out") === "1",
      automated: navigator.webdriver === true,
    }) !== null;
  } catch {
    return true;
  }
}

function stripUnsafeProperties(properties: AnalyticsProperties): AnalyticsProperties {
  const safe: AnalyticsProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    if (/(^|_)(email|e_mail|name|first_name|last_name|full_name|ip|ip_address|phone|address|lat|latitude|lng|lon|longitude|geo|location)(_|$)/i.test(normalizedKey)) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      safe[normalizedKey] = value;
    }
  }

  return safe;
}

function buildProperties(input: AnalyticsEventInput, ids: AnalyticsIds): AnalyticsProperties {
  const currentPage = input.page || getCurrentPage();
  const properties = stripUnsafeProperties({
    ...input.metadata,
    ...input.properties,
    content_id: input.properties?.content_id ?? input.entityId ?? null,
    content_title: input.properties?.content_title ?? input.entityTitle ?? null,
    language: input.properties?.language ?? input.lang ?? null,
    device_type: input.properties?.device_type ?? getDeviceType(),
    viewport_width: input.properties?.viewport_width ?? (typeof window !== "undefined" ? window.innerWidth : null),
    source_page: input.properties?.source_page ?? (typeof document !== "undefined" ? document.referrer || null : null),
    current_page: input.properties?.current_page ?? currentPage,
    referrer: input.properties?.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
    session_id: input.properties?.session_id ?? input.sessionId ?? ids.sessionId,
    anonymous_user_id: input.properties?.anonymous_user_id ?? input.visitorId ?? ids.anonymousUserId,
    environment: input.properties?.environment ?? process.env.NODE_ENV ?? "unknown",
  });
  return {
    ...properties,
    export_method: normalizeExportMethod(input.eventName, properties),
  };
}

function normalizeExportMethod(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties,
): string | null | undefined {
  const existing = typeof properties.export_method === "string" ? properties.export_method : null;
  const deviceType = properties.device_type || getDeviceType();
  const isStudioEvent = eventName.startsWith("studio_") || eventName === "video_exported";

  if (!isStudioEvent && !existing) {
    return properties.export_method;
  }

  if (existing === "mobile_recording" ||
      existing === "tablet_recording" ||
      existing === "desktop_recording" ||
      existing === "desktop_export" ||
      existing === "parrot_audio" ||
      existing === "unknown") {
    return existing;
  }

  if (
    existing === "offline_audio_render" ||
    properties.content_type === "parrot_audio" ||
    properties.section === "parrots"
  ) {
    return "parrot_audio";
  }

  if (eventName.startsWith("studio_recording_") || existing?.includes("screen_recording")) {
    if (deviceType === "desktop") return "desktop_recording";
    if (deviceType === "tablet") return "tablet_recording";
    return "mobile_recording";
  }

  if (eventName.startsWith("studio_export_") || existing === "direct_canvas_recording") {
    return "desktop_export";
  }

  return existing || "unknown";
}

function shouldSkipProgress(input: AnalyticsEventInput, properties: AnalyticsProperties) {
  if (input.eventName !== "content_progress") {
    return false;
  }

  const contentKey = String(properties.content_id || properties.content_slug || properties.current_page || "unknown");
  const percent = typeof properties.completion_percent === "number" ? properties.completion_percent : 0;
  const bucket = Math.max(0, Math.min(100, Math.floor(percent / PROGRESS_STEP) * PROGRESS_STEP));
  const key = `${contentKey}:${bucket}`;
  const now = Date.now();

  window[PROGRESS_CACHE_KEY] ||= new Map<string, { at: number; percent: number }>();
  const previous = window[PROGRESS_CACHE_KEY]?.get(key);
  if (previous && now - previous.at < PROGRESS_THROTTLE_MS) {
    return true;
  }

  window[PROGRESS_CACHE_KEY]?.set(key, { at: now, percent: bucket });
  return false;
}

function normalizeInput(args: AnalyticsTrackInput): AnalyticsEventInput {
  if (Array.isArray(args)) {
    return {
      eventName: args[0],
      properties: args[1] || {},
    };
  }

  return args;
}

function readRetryQueue(): AnalyticsEventInput[] {
  try {
    const raw = window.localStorage.getItem(RETRY_QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RETRY_QUEUE_SIZE) : [];
  } catch {
    return [];
  }
}

function writeRetryQueue(queue: AnalyticsEventInput[]) {
  try {
    window.localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(-MAX_RETRY_QUEUE_SIZE)));
  } catch {}
}

function enqueueRetryPayload(payload: AnalyticsEventInput) {
  writeRetryQueue([...readRetryQueue(), payload]);
}

function flushRetryQueue() {
  const queue = readRetryQueue();
  if (queue.length === 0) {
    return;
  }

  writeRetryQueue([]);
  for (const payload of queue) {
    void deliverPayload(payload).then((result) => {
      if (!result.delivered) enqueueRetryPayload(payload);
    });
  }
}

export async function deliverPayload(
  payload: AnalyticsEventInput,
  request: typeof fetch = fetch,
): Promise<{ delivered: boolean; status: AnalyticsDeliveryStatus | null; responseStatus: number | null }> {
  try {
    const response = await request("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    const responseBody = await response.json().catch(() => null) as { status?: unknown } | null;
    const status = responseBody?.status;
    if (response.ok && (status === "recorded" || status === "duplicate" || status === "skipped")) {
      return { delivered: true, status, responseStatus: response.status };
    }
    return { delivered: response.status >= 400 && response.status < 500, status: null, responseStatus: response.status };
  } catch {
    return { delivered: false, status: null, responseStatus: null };
  }
}

function updateActiveContentState(eventName: AnalyticsEventName, properties: AnalyticsProperties) {
  if (eventName === "content_open") {
    window[ACTIVE_CONTENT_STATE_KEY] = {
      section: properties.section,
      content_type: properties.content_type,
      content_id: properties.content_id,
      content_slug: properties.content_slug,
      content_title: properties.content_title,
      language: properties.language,
      current_page: properties.current_page,
      completion_percent: 0,
      step_index: properties.step_index ?? null,
      total_steps: properties.total_steps ?? null,
    };
    return;
  }

  if (eventName === "content_progress" || eventName === "content_complete") {
    const current = window[ACTIVE_CONTENT_STATE_KEY] || {};
    const nextCompletion =
      typeof properties.completion_percent === "number"
        ? properties.completion_percent
        : eventName === "content_complete"
          ? 100
          : current.completion_percent;
    window[ACTIVE_CONTENT_STATE_KEY] = {
      ...current,
      section: properties.section ?? current.section,
      content_type: properties.content_type ?? current.content_type,
      content_id: properties.content_id ?? current.content_id,
      content_slug: properties.content_slug ?? current.content_slug,
      content_title: properties.content_title ?? current.content_title,
      language: properties.language ?? current.language,
      current_page: properties.current_page ?? current.current_page,
      completion_percent: Math.max(
        Number(current.completion_percent || 0),
        Number(nextCompletion || 0),
      ),
      step_index: properties.step_index ?? current.step_index,
      total_steps: properties.total_steps ?? current.total_steps,
    };
    return;
  }

  if (eventName === "content_exit") {
    window[ACTIVE_CONTENT_STATE_KEY] = undefined;
  }
}

function sendPayload(payload: AnalyticsEventInput, debugEventId?: string) {
  flushRetryQueue();
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const completeDebug = (
    status: "sent" | "failed",
    responseStatus: number | null = null,
    errorMessage: string | null = null,
  ) => {
    if (!debugEventId || process.env.NODE_ENV !== "development") {
      return;
    }

    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    window.__laplaplaCompleteAnalyticsDebug?.({
      id: debugEventId,
      status,
      responseStatus,
      durationMs: Math.round(now - startedAt),
      errorMessage,
    });
  };

  try {
    void deliverPayload(payload)
      .then((result) => {
        completeDebug(result.delivered ? "sent" : "failed", result.responseStatus);
        if (!result.delivered) enqueueRetryPayload(payload);
      })
      .catch((error) => {
        completeDebug("failed", null, error instanceof Error ? error.message : "Analytics request failed");
        enqueueRetryPayload(payload);
      });
  } catch (error) {
    completeDebug("failed", null, error instanceof Error ? error.message : "Analytics request failed");
  }
}

export function getActiveContentExitProperties(currentPage?: string | null): AnalyticsProperties {
  if (typeof window === "undefined") {
    return {};
  }

  const state = window[ACTIVE_CONTENT_STATE_KEY];
  if (!state) {
    return {};
  }

  if (state.current_page && currentPage && state.current_page !== currentPage) {
    return {};
  }

  return {
    section: state.section,
    content_type: state.content_type,
    content_id: state.content_id,
    content_slug: state.content_slug,
    content_title: state.content_title,
    language: state.language,
    completion_percent: state.completion_percent ?? null,
    step_index: state.step_index ?? null,
    total_steps: state.total_steps ?? null,
  };
}

export function trackEvent(eventName: AnalyticsEventName, properties?: AnalyticsProperties): void;
export function trackEvent(input: AnalyticsEventInput): void;
export function trackEvent(
  inputOrEventName: AnalyticsEventInput | AnalyticsEventName,
  properties?: AnalyticsProperties,
) {
  if (typeof window === "undefined" || shouldSkipAnalytics()) {
    return;
  }

  try {
    const input = normalizeInput(
      typeof inputOrEventName === "string" ? [inputOrEventName, properties] : inputOrEventName,
    );
    const ids = getAnalyticsIds();
    const mergedProperties = buildProperties(input, ids);

    if (ids.isNewSession && input.eventName !== "session_start" && ids.sessionId) {
      try {
        window.localStorage.setItem(SESSION_STARTED_KEY, ids.sessionId);
      } catch {}
      trackEvent({
        eventName: "session_start",
        visitorId: ids.anonymousUserId,
        sessionId: ids.sessionId,
        properties: {
          language: mergedProperties.language,
          current_page: mergedProperties.current_page,
          section: mergedProperties.section,
        },
      });
    }

    if (shouldSkipProgress(input, mergedProperties)) {
      return;
    }

    const payload: AnalyticsEventInput = {
      ...input,
      eventId: input.eventId || createAnalyticsId(),
      page: input.page || String(mergedProperties.current_page || getCurrentPage() || ""),
      visitorId: input.visitorId ?? ids.anonymousUserId,
      sessionId: input.sessionId ?? ids.sessionId,
      metadata: stripUnsafeProperties(input.metadata || {}) as NonNullable<AnalyticsEventInput["metadata"]>,
      properties: mergedProperties,
    };

    const debugEventId =
      process.env.NODE_ENV === "development" && window.__laplaplaRecordAnalyticsDebug
        ? createDebugId()
        : undefined;
    if (debugEventId) {
      window.__laplaplaRecordAnalyticsDebug?.({
        id: debugEventId,
        eventName: input.eventName,
        route: String(payload.page || mergedProperties.current_page || getCurrentPage() || ""),
      });
    }

    updateActiveContentState(input.eventName, mergedProperties);
    sendPayload(payload, debugEventId);
  } catch {
    // Analytics must never interrupt the user-facing experience.
  }
}

export function trackSessionStart(properties?: AnalyticsProperties) {
  if (typeof window === "undefined" || shouldSkipAnalytics()) {
    return;
  }

  try {
    const ids = getAnalyticsIds();
    if (!ids.sessionId || window.localStorage.getItem(SESSION_STARTED_KEY) === ids.sessionId) {
      return;
    }
    window.localStorage.setItem(SESSION_STARTED_KEY, ids.sessionId);
    trackEvent({
      eventName: "session_start",
      visitorId: ids.anonymousUserId,
      sessionId: ids.sessionId,
      properties,
    });
    return;
  } catch {}

  trackEvent("session_start", properties);
}
