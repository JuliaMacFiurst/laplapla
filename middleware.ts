import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildCanonicalMapEntityPathFromUnknown, normalizeMapEntityType, normalizeSlug } from "@/lib/mapEntityRouting";
import { buildLocalizedPublicPath, DEFAULT_LANG, isLang } from "@/lib/i18n/routing";

const LEGACY_ENTITY_PREFIXES = new Set(["country", "animal", "river", "sea", "biome", "physic"]);
const QUERY_TYPE_KEYS = ["type", "mapType", "target_type", "entityType"];
const QUERY_SLUG_KEYS = ["target", "target_id", "slug"];

function isStaticAsset(pathname: string) {
  return /\.[a-z0-9]+$/i.test(pathname);
}

function logDevRedirect(fromPath: string, toPath: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[canonical-routes] middleware redirect ${fromPath} -> ${toPath}`);
  }
}

function redirectToCanonical(request: NextRequest, pathname: string, queryKeysToRemove: string[] = []) {
  const target = new URL(request.url);
  const locale = isLang(request.nextUrl.locale) ? request.nextUrl.locale : DEFAULT_LANG;
  target.pathname = buildLocalizedPublicPath(pathname, locale);

  queryKeysToRemove.forEach((key) => {
    target.searchParams.delete(key);
  });

  const originalUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const targetUrl = `${target.pathname}${target.search}`;
  if (originalUrl === targetUrl) {
    return NextResponse.next();
  }

  logDevRedirect(originalUrl, targetUrl);
  return NextResponse.redirect(target, 301);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const normalizedPathname = pathname !== "/" ? pathname.replace(/\/+$/, "") || "/" : pathname;

  if (
    normalizedPathname.startsWith("/api") ||
    normalizedPathname.startsWith("/_next") ||
    normalizedPathname.startsWith("/images") ||
    normalizedPathname.startsWith("/icons") ||
    normalizedPathname === "/favicon.ico" ||
    isStaticAsset(normalizedPathname)
  ) {
    return NextResponse.next();
  }

  const segments = normalizedPathname.split("/").filter(Boolean);

  if (normalizedPathname === "/map") {
    const rawType = QUERY_TYPE_KEYS.map((key) => searchParams.get(key)).find(Boolean);
    const rawSlug = QUERY_SLUG_KEYS.map((key) => searchParams.get(key)).find(Boolean);
    const canonicalType = rawType ? normalizeMapEntityType(rawType) : null;
    const normalizedSlug = rawSlug ? normalizeSlug(rawSlug) : "";

    if (canonicalType && normalizedSlug) {
      return redirectToCanonical(
        request,
        `/map/${canonicalType}/${normalizedSlug}`,
        [...QUERY_TYPE_KEYS, ...QUERY_SLUG_KEYS],
      );
    }

    return NextResponse.next();
  }

  if (segments[0] === "map" && segments.length === 3) {
    const canonicalPath = buildCanonicalMapEntityPathFromUnknown(segments[1] || "", segments[2] || "");
    if (canonicalPath && canonicalPath !== normalizedPathname) {
      return redirectToCanonical(request, canonicalPath);
    }

    if (pathname.length > 1 && pathname.endsWith("/")) {
      return redirectToCanonical(request, normalizedPathname);
    }

    return NextResponse.next();
  }

  if (segments[0] === "map" && segments.length === 2) {
    return NextResponse.next();
  }

  if (segments.length === 2 && LEGACY_ENTITY_PREFIXES.has((segments[0] || "").toLowerCase())) {
    const canonicalType = normalizeMapEntityType(segments[0] || "");
    const normalizedSlug = normalizeSlug(segments[1] || "");

    if (canonicalType && normalizedSlug) {
      return redirectToCanonical(request, `/map/${canonicalType}/${normalizedSlug}`);
    }
  }

  if (pathname.length > 1 && pathname.endsWith("/") && segments[0] === "map") {
    return redirectToCanonical(request, normalizedPathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
