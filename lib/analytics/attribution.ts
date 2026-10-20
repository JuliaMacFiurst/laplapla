export const ATTRIBUTION_VERSION = 1 as const;
export const FIRST_TOUCH_STORAGE_KEY = "laplapla_analytics_first_touch_v1";
export const SESSION_TOUCH_STORAGE_KEY = "laplapla_analytics_session_touch_v1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MAX_UTM_LENGTH = 160;
const MAX_REFERRER_LENGTH = 500;
const MAX_PATH_LENGTH = 300;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const PHONE_PATTERN = /(?:^|\D)\+?\d[\d\s().-]{7,}\d(?:\D|$)/u;

export type AttributionChannel = "direct" | "organic" | "social" | "paid" | "referral" | "campaign";

export type AttributionTouch = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  external_referrer: string | null;
  landing_pathname: string;
  attributed_at: string;
  source: string;
  channel: AttributionChannel;
};

export type AttributionSnapshot = {
  version: typeof ATTRIBUTION_VERSION;
  visitor_id: string;
  session_id: string;
  first_touch: AttributionTouch;
  session_touch: AttributionTouch;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type AttributionInput = {
  href: string;
  referrer?: string | null;
  visitorId: string;
  sessionId: string;
  now?: number;
};

const SOCIAL_HOSTS = [
  "youtube.com", "youtu.be", "instagram.com", "tiktok.com", "pinterest.com",
  "pin.it", "t.me", "telegram.me", "facebook.com", "fb.com", "x.com", "twitter.com",
];
const SEARCH_HOSTS: Array<[string, string]> = [
  ["google.", "google"], ["bing.com", "bing"], ["yandex.", "yandex"],
  ["duckduckgo.com", "duckduckgo"], ["search.yahoo.", "yahoo"], ["ecosia.org", "ecosia"],
];
const SOCIAL_SOURCES = new Set([
  "youtube", "instagram", "tiktok", "pinterest", "telegram", "facebook", "x", "twitter",
]);

function hasLikelyPii(value: string) {
  return EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value);
}

function normalizeUtm(value: string | null, lowercase = false) {
  if (!value) return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/gu, "").slice(0, MAX_UTM_LENGTH);
  if (!normalized || hasLikelyPii(normalized)) return null;
  return lowercase ? normalized.toLowerCase() : normalized;
}

function hostnameMatches(hostname: string, candidate: string) {
  const normalized = hostname.toLowerCase().replace(/^www\./u, "");
  return candidate.endsWith(".")
    ? normalized.includes(candidate)
    : normalized === candidate || normalized.endsWith(`.${candidate}`);
}

function normalizeExternalReferrer(referrer: string | null | undefined, currentHostname: string) {
  if (!referrer) return null;
  try {
    const parsed = new URL(referrer);
    if (!/^https?:$/u.test(parsed.protocol) || parsed.username || parsed.password) return null;
    if (hostnameMatches(parsed.hostname, currentHostname.replace(/^www\./u, ""))) return null;
    const safe = `${parsed.origin}${parsed.pathname}`.slice(0, MAX_REFERRER_LENGTH);
    return hasLikelyPii(safe) ? null : safe;
  } catch {
    return null;
  }
}

function sourceFromReferrer(referrer: string | null) {
  if (!referrer) return { source: "direct", channel: "direct" as const };
  const hostname = new URL(referrer).hostname.toLowerCase().replace(/^www\./u, "");
  const search = SEARCH_HOSTS.find(([candidate]) => hostnameMatches(hostname, candidate));
  if (search) return { source: search[1], channel: "organic" as const };
  const social = SOCIAL_HOSTS.find((candidate) => hostnameMatches(hostname, candidate));
  if (social) {
    const source = social === "youtu.be" ? "youtube"
      : social === "pin.it" ? "pinterest"
        : social === "t.me" || social === "telegram.me" ? "telegram"
          : social.split(".")[0];
    return { source, channel: "social" as const };
  }
  return { source: hostname, channel: "referral" as const };
}

function classifyTouch(utmSource: string | null, utmMedium: string | null, referrer: string | null) {
  if (!utmSource && !utmMedium) return sourceFromReferrer(referrer);
  const source = utmSource || sourceFromReferrer(referrer).source;
  const medium = utmMedium?.toLowerCase() || "";
  if (["cpc", "ppc", "paid", "paid_social", "display", "affiliate"].includes(medium)) {
    return { source, channel: "paid" as const };
  }
  if (medium === "organic") return { source, channel: "organic" as const };
  if (medium === "social" || SOCIAL_SOURCES.has(source)) return { source, channel: "social" as const };
  return { source, channel: "campaign" as const };
}

export function createAttributionTouch(input: Pick<AttributionInput, "href" | "referrer" | "now">): AttributionTouch {
  const url = new URL(input.href);
  const utmSource = normalizeUtm(url.searchParams.get("utm_source"), true);
  const utmMedium = normalizeUtm(url.searchParams.get("utm_medium"), true);
  const externalReferrer = normalizeExternalReferrer(input.referrer, url.hostname);
  const classified = classifyTouch(utmSource, utmMedium, externalReferrer);
  return {
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: normalizeUtm(url.searchParams.get("utm_campaign")),
    utm_content: normalizeUtm(url.searchParams.get("utm_content")),
    utm_term: normalizeUtm(url.searchParams.get("utm_term")),
    external_referrer: externalReferrer,
    landing_pathname: (url.pathname || "/").slice(0, MAX_PATH_LENGTH),
    attributed_at: new Date(input.now ?? Date.now()).toISOString(),
    ...classified,
  };
}

function isTouch(value: unknown): value is AttributionTouch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const touch = value as Record<string, unknown>;
  const nullableUtmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  if (!nullableUtmKeys.every((key) => touch[key] === null || (
    typeof touch[key] === "string" &&
    touch[key].length <= MAX_UTM_LENGTH &&
    !hasLikelyPii(touch[key])
  ))) return false;
  if (touch.external_referrer !== null && (typeof touch.external_referrer !== "string" || touch.external_referrer.length > MAX_REFERRER_LENGTH)) return false;
  if (typeof touch.landing_pathname !== "string" || !touch.landing_pathname.startsWith("/") || touch.landing_pathname.length > MAX_PATH_LENGTH) return false;
  if (typeof touch.attributed_at !== "string" || !Number.isFinite(Date.parse(touch.attributed_at))) return false;
  if (typeof touch.source !== "string" || !touch.source || touch.source.length > MAX_UTM_LENGTH || hasLikelyPii(touch.source)) return false;
  return ["direct", "organic", "social", "paid", "referral", "campaign"].includes(String(touch.channel));
}

function readTouch(storage: StorageLike, key: string) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "null") as unknown;
    return isTouch(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveAttributionSnapshot(storage: StorageLike, input: AttributionInput): AttributionSnapshot {
  const currentTouch = createAttributionTouch(input);
  const firstTouch = readTouch(storage, FIRST_TOUCH_STORAGE_KEY) || currentTouch;
  if (!readTouch(storage, FIRST_TOUCH_STORAGE_KEY)) {
    storage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(firstTouch));
  }

  let sessionTouch = currentTouch;
  try {
    const stored = JSON.parse(storage.getItem(SESSION_TOUCH_STORAGE_KEY) || "null") as { session_id?: unknown; touch?: unknown } | null;
    if (stored?.session_id === input.sessionId && isTouch(stored.touch)) sessionTouch = stored.touch;
  } catch {}
  storage.setItem(SESSION_TOUCH_STORAGE_KEY, JSON.stringify({ session_id: input.sessionId, touch: sessionTouch }));

  return {
    version: ATTRIBUTION_VERSION,
    visitor_id: input.visitorId,
    session_id: input.sessionId,
    first_touch: firstTouch,
    session_touch: sessionTouch,
  };
}

function normalizeServerTouch(value: unknown, now: number): AttributionTouch | null {
  if (!isTouch(value)) return null;
  try {
    const attributedAt = Date.parse(value.attributed_at);
    if (attributedAt < Date.parse("2020-01-01T00:00:00.000Z") || attributedAt > now + 5 * 60 * 1000) return null;
    const url = new URL(value.external_referrer || "https://direct.invalid/");
    const referrer = value.external_referrer
      ? normalizeExternalReferrer(value.external_referrer, "laplapla.invalid")
      : null;
    if (value.external_referrer && (!referrer || url.search || url.hash)) return null;
    const utmSource = normalizeUtm(value.utm_source, true);
    const utmMedium = normalizeUtm(value.utm_medium, true);
    const classified = classifyTouch(utmSource, utmMedium, referrer);
    if (classified.source !== value.source || classified.channel !== value.channel) return null;
    return {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: normalizeUtm(value.utm_campaign),
      utm_content: normalizeUtm(value.utm_content),
      utm_term: normalizeUtm(value.utm_term),
      external_referrer: referrer,
      landing_pathname: value.landing_pathname,
      attributed_at: new Date(attributedAt).toISOString(),
      ...classified,
    };
  } catch {
    return null;
  }
}

export function parseAttributionSnapshot(value: unknown, now = Date.now()): AttributionSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.version !== ATTRIBUTION_VERSION) return null;
  if (typeof snapshot.visitor_id !== "string" || !UUID_PATTERN.test(snapshot.visitor_id)) return null;
  if (typeof snapshot.session_id !== "string" || !UUID_PATTERN.test(snapshot.session_id)) return null;
  const firstTouch = normalizeServerTouch(snapshot.first_touch, now);
  const sessionTouch = normalizeServerTouch(snapshot.session_touch, now);
  if (!firstTouch || !sessionTouch) return null;
  return {
    version: ATTRIBUTION_VERSION,
    visitor_id: snapshot.visitor_id,
    session_id: snapshot.session_id,
    first_touch: firstTouch,
    session_touch: sessionTouch,
  };
}

export function attributionAnalyticsProperties(snapshot: AttributionSnapshot) {
  return {
    attribution_first_source: snapshot.first_touch.source,
    attribution_first_channel: snapshot.first_touch.channel,
    attribution_session_source: snapshot.session_touch.source,
    attribution_session_channel: snapshot.session_touch.channel,
    attribution_utm_source: snapshot.session_touch.utm_source,
    attribution_utm_medium: snapshot.session_touch.utm_medium,
    attribution_utm_campaign: snapshot.session_touch.utm_campaign,
  };
}
