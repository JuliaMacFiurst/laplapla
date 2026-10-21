export type OriginMode = "WEB" | "ANDROID_APP" | "UNKNOWN";

export function initialOriginMode(pageProps: Record<string, unknown>): OriginMode {
  const value = pageProps.originMode;
  return value === "WEB" || value === "ANDROID_APP" ? value : "UNKNOWN";
}

// Only the request Host selects a production mode. Forwarded headers can veto it,
// but can never promote an unknown Host into the web commerce origin.
export function classifyOriginHost(
  host: string | string[] | undefined,
  forwardedHost?: string | string[],
  production = process.env.NODE_ENV === "production",
): OriginMode {
  if (typeof host !== "string" || !host || host.includes(",")) return "UNKNOWN";
  const normalized = host.toLowerCase();
  if (forwardedHost !== undefined &&
      (typeof forwardedHost !== "string" || forwardedHost.toLowerCase() !== normalized)) return "UNKNOWN";
  if (normalized === "www.laplapla.com") return "WEB";
  if (normalized === "app.laplapla.com") return "ANDROID_APP";
  if (!production && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return "WEB";
  return "UNKNOWN";
}

export function browserOriginMode(): OriginMode {
  if (typeof window === "undefined") return "UNKNOWN";
  return classifyOriginHost(window.location.host);
}

export function normalizedRoutePath(pathname: string): string {
  let path = pathname;
  const dataRoute = path.match(/^\/_next\/data\/[^/]+\/(.*)\.json$/);
  if (dataRoute) path = `/${dataRoute[1]}`;
  path = path.replace(/^\/(ru|en|he)(?=\/|$)/, "") || "/";
  return path.replace(/\/+$/, "") || "/";
}

export function isPurchasePage(pathname: string): boolean {
  const path = normalizedRoutePath(pathname);
  if (path === "/shop") return true;
  if (!path.startsWith("/shop/")) return false;
  const parts = path.split("/").filter(Boolean);
  return !(parts.length === 3 && parts[2] === "create");
}

export function isPurchaseApi(pathname: string): boolean {
  const path = normalizedRoutePath(pathname);
  return path.startsWith("/api/customer/checkout/paypal/") ||
    path === "/api/shop/paypal/config" || path === "/api/shop/preorders";
}
