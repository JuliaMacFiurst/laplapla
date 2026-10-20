import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import { getSafeRelativeRedirect } from "@/lib/security/safeRedirect";

export const CUSTOMER_AUTH_NEXT_STORAGE_KEY = "laplapla:customer-auth-next";

type RedirectStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function getDefaultCustomerDestination(lang: Lang) {
  return buildLocalizedPublicPath("/account", lang);
}
export function resolveCustomerDestination(value: unknown, lang: Lang) {
  return getSafeRelativeRedirect(value, getDefaultCustomerDestination(lang));
}

export function buildCustomerAuthCallbackUrl(origin: string, lang: Lang) {
  return new URL(buildLocalizedPublicPath("/auth/callback", lang), origin).toString();
}

export function storeCustomerAuthDestination(
  storage: RedirectStorage,
  value: unknown,
  lang: Lang,
) {
  const destination = resolveCustomerDestination(value, lang);
  storage.setItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY, destination);
  return destination;
}

export function consumeCustomerAuthDestination(
  storage: RedirectStorage,
  queryValue: unknown,
  lang: Lang,
) {
  const storedValue = storage.getItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY);
  storage.removeItem(CUSTOMER_AUTH_NEXT_STORAGE_KEY);

  // A supplied query value always wins, including when it is unsafe. In that
  // case getSafeRelativeRedirect deliberately falls back to /account rather
  // than reviving a stale destination from storage.
  return resolveCustomerDestination(
    typeof queryValue === "string" ? queryValue : storedValue,
    lang,
  );
}
