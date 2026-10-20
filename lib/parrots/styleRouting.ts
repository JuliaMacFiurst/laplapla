import type { ParsedUrlQuery } from "querystring";
import type { Lang } from "@/i18n";
import { buildLocalizedHref, buildLocalizedQuery } from "@/lib/i18n/routing";

export const PARROTS_PUBLIC_PATH = "/parrots";

export function readParrotStyleQuery(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function resolveParrotStyleSelection(
  availableStyleIds: readonly string[],
  queryStyle: string | null,
  stylesAreAuthoritative: boolean,
) {
  if (queryStyle && availableStyleIds.includes(queryStyle)) {
    return {
      styleId: queryStyle,
      shouldNormalizeUrl: false,
    } as const;
  }

  if (queryStyle && !stylesAreAuthoritative) {
    return {
      styleId: null,
      shouldNormalizeUrl: false,
    } as const;
  }

  return {
    styleId: availableStyleIds[0] ?? null,
    shouldNormalizeUrl: Boolean(queryStyle),
  } as const;
}

function preservePublicQuery(query: ParsedUrlQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([key, value]) => key !== "lang" && value !== undefined),
  );
}

export function buildParrotStyleRoute(
  lang: Lang,
  styleId: string,
  currentQuery: ParsedUrlQuery = {},
) {
  return {
    pathname: PARROTS_PUBLIC_PATH,
    query: buildLocalizedQuery(lang, {
      ...preservePublicQuery(currentQuery),
      style: styleId,
    }),
  };
}

export function buildParrotsRouteWithoutStyle(
  lang: Lang,
  currentQuery: ParsedUrlQuery = {},
) {
  const query = preservePublicQuery(currentQuery);
  delete query.style;

  return {
    pathname: PARROTS_PUBLIC_PATH,
    query: buildLocalizedQuery(lang, query),
  };
}

export function buildParrotStyleHref(styleId: string, lang: Lang) {
  const params = new URLSearchParams({ style: styleId });
  return buildLocalizedHref(`${PARROTS_PUBLIC_PATH}?${params.toString()}`, lang);
}
