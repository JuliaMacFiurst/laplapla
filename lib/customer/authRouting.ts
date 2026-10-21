import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getSafeRelativeRedirect } from "@/lib/security/safeRedirect";
import { classifyOriginHost, isPurchasePage, type OriginMode } from "@/lib/runtime/originMode";

export const CUSTOMER_AUTH_NEXT_STORAGE_KEY = "laplapla:customer-auth-next";

type RedirectStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function getDefaultCustomerDestination(lang: Lang) {
  return buildLocalizedPublicPath("/account", lang);
}
export function resolveCustomerDestination(value: unknown, lang: Lang, mode: OriginMode = "WEB") {
  const destination = getSafeRelativeRedirect(value, getDefaultCustomerDestination(lang));
  return mode !== "WEB" && isPurchasePage(new URL(destination, "https://app.laplapla.com").pathname)
    ? getDefaultCustomerDestination(lang) : destination;
}

export function buildCustomerAuthCallbackUrl(origin: string, lang: Lang) {
  const parsed = new URL(origin);
  if (parsed.origin !== origin || classifyOriginHost(parsed.host) === "UNKNOWN" ||
      (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1")) {
    throw new Error("Untrusted customer authentication origin");
  }
  return new URL(buildLocalizedPublicPath("/auth/callback", lang), origin).toString();
}

export function storeCustomerAuthDestination(
  storage: RedirectStorage,
  value: unknown,
  lang: Lang,
  mode: OriginMode = "WEB",
) {
  const destination = resolveCustomerDestination(value, lang, mode);
  storage.setItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY, destination);
  return destination;
}

export function consumeCustomerAuthDestination(
  storage: RedirectStorage,
  queryValue: unknown,
  lang: Lang,
  mode: OriginMode = "WEB",
) {
  const storedValue = storage.getItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY);
  storage.removeItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY);

  // A supplied query value always wins, including when it is unsafe. In that
  // case getSafeRelativeRedirect deliberately falls back to /account rather
  // than reviving a stale destination from storage.
  return resolveCustomerDestination(
    typeof queryValue === "string" ? queryValue : storedValue,
    lang,
    mode,
  );
}
