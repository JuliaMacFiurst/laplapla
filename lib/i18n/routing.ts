import type { NextApiRequest } from "next";
import type { NextRouter } from "next/router";
import type { Lang } from "@/i18n";

const LANGS: Lang[] = ["ru", "en", "he"];
export const DEFAULT_LANG: Lang = "ru";

export const isLang = (value: unknown): value is Lang => {
  return typeof value === "string" && LANGS.includes(value as Lang);
};

const normalizeLang = (value: unknown): Lang | null => {
  if (Array.isArray(value)) {
    const first = value[0];
    return isLang(first) ? first : null;
  }
  return isLang(value) ? value : null;
};

const normalizeAcceptLanguage = (value: unknown): Lang | null => {
  if (typeof value !== "string") return null;

  const candidates = value
    .split(",")
    .map((part) => part.trim().split(";")[0]?.split("-")[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    const lang = normalizeLang(candidate);
    if (lang) return lang;
  }

  return null;
};

const getLangFromCookie = (): Lang | null => {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/(?:^|; )laplapla_lang=([^;]+)/);
  const value = match?.[1];
  return normalizeLang(value);
};

const getLangFromStorage = (): Lang | null => {
  if (typeof window === "undefined") return null;

  const laplaplaLang = window.localStorage.getItem("laplapla_lang");
  const legacyLang = window.localStorage.getItem("lang");
  return normalizeLang(laplaplaLang) ?? normalizeLang(legacyLang);
};

export const getCurrentLang = (router: Pick<NextRouter, "query" | "locale">): Lang => {
  return (
    normalizeLang(router.query.lang) ??
    normalizeLang(router.locale) ??
    getLangFromCookie() ??
    getLangFromStorage() ??
    DEFAULT_LANG
  );
};

export const getRequestLang = (
  req: Pick<NextApiRequest, "query" | "cookies" | "headers">,
): Lang => {
  return (
    normalizeLang(req.query.lang) ??
    normalizeLang(req.cookies?.laplapla_lang) ??
    normalizeLang(req.headers["x-laplapla-lang"]) ??
    normalizeAcceptLanguage(req.headers["accept-language"]) ??
    DEFAULT_LANG
  );
};

export const buildLocalizedQuery = (
  lang: Lang,
  query?: Record<string, string | number | boolean | undefined>,
) => {
  return {
    ...(query ?? {}),
    lang,
  };
};

export const buildLocalizedHref = (href: string, lang: Lang): string => {
  const [pathWithQuery, hash = ""] = href.split("#");
  const [path, queryString = ""] = pathWithQuery.split("?");
  const params = new URLSearchParams(queryString);
  params.set("lang", lang);

  const nextQuery = params.toString();
  const nextHash = hash ? `#${hash}` : "";
  return nextQuery ? `${path}?${nextQuery}${nextHash}` : `${path}${nextHash}`;
};

export const buildLocalizedAsPath = (asPath: string, lang: Lang): string => {
  const [pathWithQuery, hash = ""] = asPath.split("#");
  const [path, queryString = ""] = pathWithQuery.split("?");
  const localizedPath = buildLocalizedPublicPath(path || "/", lang);
  const params = new URLSearchParams(queryString);
  params.set("lang", lang);

  const nextQuery = params.toString();
  const nextHash = hash ? `#${hash}` : "";
  return nextQuery ? `${localizedPath}?${nextQuery}${nextHash}` : `${localizedPath}${nextHash}`;
};

export const buildLocalizedPublicPath = (path: string, lang?: Lang): string => {
  const cleanPath = path.split("#")[0]?.split("?")[0] || "/";
  const normalizedPath = cleanPath === "/"
    ? "/"
    : `/${cleanPath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const segments = normalizedPath.split("/").filter(Boolean);
  const baseSegments = normalizeLang(segments[0]) ? segments.slice(1) : segments;
  const resolvedLang = lang ?? DEFAULT_LANG;
  const localizedSegments = resolvedLang === DEFAULT_LANG
    ? baseSegments
    : [resolvedLang, ...baseSegments];

  return localizedSegments.length ? `/${localizedSegments.join("/")}` : "/";
};
