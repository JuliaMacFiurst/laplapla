import type { AnalyticsEventInput } from "@/lib/analytics/events";

const VISITOR_STORAGE_KEY = "laplapla_analytics_visitor_id";
const SESSION_STORAGE_KEY = "laplapla_analytics_session_id";

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

function getAnalyticsIds() {
  if (typeof window === "undefined") {
    return { visitorId: null, sessionId: null };
  }

  try {
    return {
      visitorId: readOrCreateStorageId(window.localStorage, VISITOR_STORAGE_KEY),
      sessionId: readOrCreateStorageId(window.sessionStorage, SESSION_STORAGE_KEY),
    };
  } catch {
    return { visitorId: null, sessionId: null };
  }
}

export function trackEvent(input: AnalyticsEventInput) {
  if (typeof window === "undefined") {
    return;
  }

  const ids = getAnalyticsIds();
  const payload: AnalyticsEventInput = {
    ...input,
    page: input.page || `${window.location.pathname}${window.location.search}`,
    visitorId: input.visitorId ?? ids.visitorId,
    sessionId: input.sessionId ?? ids.sessionId,
  };
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics/event", blob)) {
        return;
      }
    }
  } catch {}

  fetch("/api/analytics/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}
