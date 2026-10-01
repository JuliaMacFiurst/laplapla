import type { Lang } from "@/i18n";

export const PREORDER_LOCALES: readonly Lang[] = ["ru", "en", "he"];
export const MAX_PREORDER_EMAIL_LENGTH = 320;

export type PreorderOfferStatus = "open" | "closed";

export type PreorderSignupResponse =
  | { ok: true; status: "registered" }
  | {
      ok: false;
      code:
        | "invalid_request"
        | "invalid_email"
        | "consent_required"
        | "unsupported_locale"
        | "preorder_closed"
        | "unavailable";
    };

export function isPreorderLocale(value: unknown): value is Lang {
  return typeof value === "string" && PREORDER_LOCALES.includes(value as Lang);
}
