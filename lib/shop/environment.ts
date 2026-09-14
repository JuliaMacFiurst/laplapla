/**
 * LapLapLa Shop — Runtime environment detection.
 *
 * Determines whether the app is running as:
 *   - "web"            — standard browser tab
 *   - "twa"            — Android Trusted Web Activity
 *   - "pwa-standalone" — installed PWA (iOS/desktop standalone)
 *
 * IMPORTANT SAFETY NOTE:
 * ─────────────────────
 * The TWA detection heuristic below uses observable browser signals
 * (display-mode, user-agent, referrer). It is NOT a cryptographic
 * proof of the runtime context and MUST NOT be used as the sole
 * basis for payment branching in production.
 *
 * Before enabling real Google Play Billing:
 *   1. Validate detection on a physical Android device running the
 *      signed production TWA APK.
 *   2. Consider server-side validation of the Digital Goods API
 *      purchase token.
 *   3. Review Google Play policy for digital goods at that time.
 *
 * Phase 1A uses this solely for analytics and future UI branching
 * (e.g. showing "Coming soon" vs a checkout button).
 */

export const COMMERCE_ENVIRONMENTS = [
  "web",
  "twa",
  "pwa-standalone",
] as const;

export type CommerceEnvironment = (typeof COMMERCE_ENVIRONMENTS)[number];

/**
 * Best-effort runtime environment detection.
 *
 * See the safety note above — do NOT rely on this for real payment
 * decisions without additional server-side verification.
 */
export function detectCommerceEnvironment(): CommerceEnvironment {
  if (typeof window === "undefined") {
    return "web";
  }

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (!isStandalone) {
    return "web";
  }

  // Heuristic for TWA: Android user-agent + standalone display mode.
  // The `android-app://` referrer check is intentionally omitted here
  // because it is not reliably set across all TWA launch scenarios
  // (e.g. deep links, task restoration). User-Agent + standalone is
  // a safer baseline signal for analytics purposes.
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    return "twa";
  }

  return "pwa-standalone";
}

/**
 * Whether the current environment might require Google Play Billing
 * for digital goods (as opposed to external web checkout).
 *
 * This is a HINT, not a policy enforcement mechanism.
 */
export function mayRequirePlayBilling(env: CommerceEnvironment): boolean {
  return env === "twa";
}
