import type {
  AnalyticsEventInput,
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics/events";

const VISITOR_STORAGE_KEY = "laplapla_analytics_visitor_id";
const SESSION_STORAGE_KEY = "laplapla_analytics_session_id";
const SESSION_STARTED_KEY = "laplapla_analytics_session_started";
const RETRY_QUEUE_STORAGE_KEY = "laplapla_analytics_retry_queue";
const PAGE_VIEW_CACHE_KEY = "__laplaplaTrackedPageViews";
const CONTENT_OPEN_CACHE_KEY = "__laplaplaTrackedContentOpens";
const PROGRESS_CACHE_KEY = "__laplaplaProgressEvents";
const ACTIVE_CONTENT_STATE_KEY = "__laplaplaActiveContentState";
const PROGRESS_THROTTLE_MS = 15_000;
const PROGRESS_STEP = 10;
const MAX_RETRY_QUEUE_SIZE = 20;

type AnalyticsTrackInput =
  | AnalyticsEventInput
  | [eventName: AnalyticsEventName, properties?: AnalyticsProperties];

type AnalyticsIds = {
  anonymousUserId: string | null;
  sessionId: string | null;
};

declare global {
  interface Window {
    [PAGE_VIEW_CACHE_KEY]?: Set<string>;
    [CONTENT_OPEN_CACHE_KEY]?: Set<string>;
    [PROGRESS_CACHE_KEY]?: Map<string, { at: number; percent: number }>;
    [ACTIVE_CONTENT_STATE_KEY]?: AnalyticsProperties;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const next = char === "x" ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function readOrCreateStorageId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = createId();
  storage.setItem(key, next);
  return next;
}

function getAnalyticsIds(): AnalyticsIds {
  if (typeof window === "undefined") {
    return { anonymousUserId: null, sessionId: null };
  }

  try {
    return {
      anonymousUserId: readOrCreateStorageId(window.localStorage, VISITOR_STORAGE_KEY),
      sessionId: readOrCreateStorageId(window.sessionStorage, SESSION_STORAGE_KEY),
    };
  } catch {
    return { anonymousUserId: null, sessionId: null };
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

    return window.localStorage.getItem("laplapla_analytics_opt_out") === "1";
  } catch {
    return false;
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

function shouldSkipPageView(input: AnalyticsEventInput, properties: AnalyticsProperties) {
  if (input.eventName !== "page_view") {
    return false;
  }

  const key = `${properties.current_page || input.page || ""}:${properties.language || input.lang || ""}`;
  if (!key.trim()) {
    return false;
  }

  window[PAGE_VIEW_CACHE_KEY] ||= new Set<string>();
  if (window[PAGE_VIEW_CACHE_KEY]?.has(key)) {
    return true;
  }

  window[PAGE_VIEW_CACHE_KEY]?.add(key);
  return false;
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

function shouldSkipContentOpen(input: AnalyticsEventInput, properties: AnalyticsProperties) {
  if (input.eventName !== "content_open") {
    return false;
  }

  const key = [
    properties.current_page || input.page || "",
    properties.content_type || "",
    properties.content_id || properties.content_slug || "",
    properties.language || input.lang || "",
  ].join(":");
  if (!key.replace(/:/g, "").trim()) {
    return false;
  }

  window[CONTENT_OPEN_CACHE_KEY] ||= new Set<string>();
  if (window[CONTENT_OPEN_CACHE_KEY]?.has(key)) {
    return true;
  }

  window[CONTENT_OPEN_CACHE_KEY]?.add(key);
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
    try {
      void fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => enqueueRetryPayload(payload));
    } catch {
      enqueueRetryPayload(payload);
    }
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

function sendPayload(payload: AnalyticsEventInput) {
  const body = JSON.stringify(payload);
  flushRetryQueue();

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics/event", blob)) {
        return;
      }
    }
  } catch {}

  try {
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => enqueueRetryPayload(payload));
  } catch {}
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

    if (
      shouldSkipPageView(input, mergedProperties) ||
      shouldSkipContentOpen(input, mergedProperties) ||
      shouldSkipProgress(input, mergedProperties)
    ) {
      return;
    }

    const payload: AnalyticsEventInput = {
      ...input,
      page: input.page || String(mergedProperties.current_page || getCurrentPage() || ""),
      visitorId: input.visitorId ?? ids.anonymousUserId,
      sessionId: input.sessionId ?? ids.sessionId,
      metadata: stripUnsafeProperties(input.metadata || {}) as NonNullable<AnalyticsEventInput["metadata"]>,
      properties: mergedProperties,
    };

    updateActiveContentState(input.eventName, mergedProperties);
    sendPayload(payload);
  } catch {
    // Analytics must never interrupt the user-facing experience.
  }
}

export function trackSessionStart(properties?: AnalyticsProperties) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (window.sessionStorage.getItem(SESSION_STARTED_KEY) === "1") {
      return;
    }
    window.sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  } catch {}

  trackEvent("session_start", properties);
}
