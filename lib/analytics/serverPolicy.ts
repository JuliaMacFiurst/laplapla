const TECHNICAL_PATHS = ["/internal", "/admin", "/admin-login", "/auth/callback"];

function normalizeHostname(value: string | undefined) {
  return (value || "").split(",")[0].trim().split(":")[0].toLowerCase();
}

function isTechnicalPath(pathname: string) {
  return TECHNICAL_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function urlFromHeader(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getServerAnalyticsSkipReason(input: {
  nodeEnv?: string;
  vercelEnv?: string;
  host?: string;
  forwardedHost?: string;
  origin?: string;
  referer?: string;
  userAgent?: string;
  productionHosts?: string[];
}) {
  if (input.nodeEnv !== "production") return "non_production_server";
  if (input.vercelEnv && input.vercelEnv !== "production") return "vercel_preview";
  if (/(headlesschrome|playwright|puppeteer|selenium|cypress)/i.test(input.userAgent || "")) return "automated_browser";

  const host = normalizeHostname(input.forwardedHost || input.host);
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") return "local_host";

  const allowedHosts = new Set(
    (input.productionHosts?.length ? input.productionHosts : ["laplapla.com", "www.laplapla.com"])
      .map(normalizeHostname)
      .filter(Boolean),
  );
  if (!allowedHosts.has(host)) return "non_production_host";

  const origin = urlFromHeader(input.origin);
  if (origin && !allowedHosts.has(normalizeHostname(origin.hostname))) return "non_production_origin";

  const referer = urlFromHeader(input.referer);
  if (!referer) return "missing_referer";
  if (!allowedHosts.has(normalizeHostname(referer.hostname))) return "non_production_referer";
  if (isTechnicalPath(referer.pathname)) return "technical_route";

  return null;
}

export function analyticsProductionHostsFromEnv(env: NodeJS.ProcessEnv) {
  const configured = env.ANALYTICS_PRODUCTION_HOSTS?.split(",").map((item) => item.trim()).filter(Boolean) || [];
  const urlHosts = [env.NEXT_PUBLIC_SITE_URL, env.SITE_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .map((value) => {
      if (!value) return null;
      try {
        return new URL(value.includes("://") ? value : `https://${value}`).hostname;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(["laplapla.com", "www.laplapla.com", ...configured, ...urlHosts]));
}
