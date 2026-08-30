import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath, isLang } from "@/lib/i18n/routing";

const EXCLUDED_PREFIXES = ["/api", "/_next", "/admin"];
const EXCLUDED_PATHS = new Set([
  "/admin-login",
  "/studio",
  "/cats/studio",
  "/cats/export",
  "/parrots/studio",
  "/caps/stories/create",
  "/install",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/sw.js",
  "/manifest.json",
  "/favicon_io/site.webmanifest",
]);
const STATIC_FILE_PATTERN = /\.[a-z0-9]+$/i;

export const isLanguageRestoreExcludedPath = (pathname: string) =>
  EXCLUDED_PATHS.has(pathname) ||
  EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
  pathname.startsWith("/workbox-") ||
  STATIC_FILE_PATTERN.test(pathname);

export const getLanguageRestoreRedirect = (
  pathname: string,
  storedLanguage: string | null | undefined,
): string | null => {
  if (isLanguageRestoreExcludedPath(pathname)) return null;

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (firstSegment === "en" || firstSegment === "he") return null;

  const lang: Lang | null = isLang(storedLanguage) ? storedLanguage : null;
  if (!lang || lang === "ru") return null;

  return buildLocalizedPublicPath(pathname, lang);
};
