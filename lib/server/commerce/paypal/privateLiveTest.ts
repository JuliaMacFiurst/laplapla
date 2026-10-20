import type { PayPalServerConfig } from "./config";
import { createHmac, timingSafeEqual } from "node:crypto";

export const PRIVATE_LIVE_TEST_COOKIE = "__Host-laplapla-live-test";
// Keep the return page available if approval outlives the creation window.
// Creating another PayPal order still requires the independently checked server flag.
const COOKIE_MAX_AGE_SECONDS = 6 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function configuredUserId() {
  const id = process.env.SHOP_PRIVATE_LIVE_TEST_USER_ID?.trim();
  return id && UUID.test(id) ? id.toLowerCase() : null;
}

function configuredStart() {
  const value = process.env.SHOP_PRIVATE_LIVE_TEST_NOT_BEFORE?.trim();
  if (!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/u.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function hasPrivateLiveTestConfiguration(config: PayPalServerConfig) {
  const start = configuredStart();
  return config.environment === "live"
    && process.env.SHOP_PRIVATE_LIVE_TEST_ENABLED === "true"
    && process.env.SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED === "true"
    && Boolean(configuredUserId())
    && start !== null && start <= Date.now() && Date.now() - start < 24 * 60 * 60_000
    && Boolean(process.env.RESEND_API_KEY?.trim())
    && Boolean(process.env.RESEND_FROM_EMAIL?.trim())
    && Boolean(process.env.RECEIPT_PDF_STORAGE_BUCKET?.trim());
}

export function isPrivateLiveTestCustomer(config: PayPalServerConfig, user: { id: string; email_confirmed_at?: string | null }) {
  return hasPrivateLiveTestConfiguration(config)
    && user.id.toLowerCase() === configuredUserId()
    && Boolean(user.email_confirmed_at);
}

function signPrivateAccess(config: PayPalServerConfig, userId: string, expiresAt: number) {
  return createHmac("sha256", config.clientSecret)
    .update(`laplapla-private-live-checkout:v1:${userId}:${expiresAt}`)
    .digest("hex");
}

export function createPrivateLiveCheckoutCookie(config: PayPalServerConfig, user: { id: string; email_confirmed_at?: string | null }) {
  if (!isPrivateLiveTestCustomer(config, user)) return null;
  const expiresAt = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
  const signature = signPrivateAccess(config, user.id.toLowerCase(), expiresAt);
  return `${PRIVATE_LIVE_TEST_COOKIE}=${expiresAt}.${signature}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function hasValidPrivateLiveCheckoutCookie(config: PayPalServerConfig, cookie: string | undefined) {
  if (config.environment !== "live" || !config.clientSecret || !cookie) return false;
  const match = /^(\d{13})\.([0-9a-f]{64})$/u.exec(cookie);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= Date.now() || expiresAt > Date.now() + COOKIE_MAX_AGE_SECONDS * 1000) return false;
  const userId = configuredUserId();
  if (!userId) return false;
  const expected = Buffer.from(signPrivateAccess(config, userId, expiresAt), "hex");
  const actual = Buffer.from(match[2], "hex");
  return timingSafeEqual(expected, actual);
}

export function canDeliverPrivateLiveTestOriginal(order: {
  user_id: string;
  created_at: string;
  provider_environment: string | null;
}) {
  const start = configuredStart();
  return process.env.SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED === "true"
    && Boolean(configuredUserId())
    && start !== null
    && order.provider_environment === "live"
    && order.user_id.toLowerCase() === configuredUserId()
    && Date.parse(order.created_at) >= start;
}

export function isPrivateLiveReceiptRecoveryEnabled() {
  return process.env.SHOP_PRIVATE_LIVE_TEST_RECEIPT_EMAIL_ENABLED === "true"
    && Boolean(configuredUserId())
    && configuredStart() !== null;
}

export function getPrivateLiveReceiptRecoveryScope() {
  const userId = configuredUserId();
  const start = configuredStart();
  return isPrivateLiveReceiptRecoveryEnabled() && userId && start !== null
    ? { userId, notBefore: new Date(start).toISOString() }
    : null;
}
