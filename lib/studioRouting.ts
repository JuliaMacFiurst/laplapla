import { useRouter } from "next/router";
import type { Lang } from "@/i18n";
import { buildLocalizedHref, buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";

export type StudioType = "parrot" | "cats" | "dogs";

type StudioQueryValue = string | number | boolean | undefined;

export function buildStudioQuery(
  type: StudioType,
  lang: Lang,
  query?: Record<string, StudioQueryValue>,
) {
  return buildLocalizedQuery(lang, {
    ...(query ?? {}),
    type,
  });
}

export function buildStudioRoute(
  type: StudioType,
  lang: Lang,
  query?: Record<string, StudioQueryValue>,
) {
  return {
    pathname: "/studio",
    query: buildStudioQuery(type, lang, query),
  };
}

export function buildStudioHref(
  type: StudioType,
  lang: Lang,
  query?: Record<string, StudioQueryValue>,
) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("lang", lang);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });

  return buildLocalizedHref(`/studio?${params.toString()}`, lang);
}

export function useStudioRouter() {
  const router = useRouter();
  const lang = getCurrentLang(router);

  return {
    openParrot: (query?: Record<string, StudioQueryValue>) =>
      router.push(buildStudioRoute("parrot", lang, query), undefined, { locale: lang }),
    openCats: (query?: Record<string, StudioQueryValue>) =>
      router.push(buildStudioRoute("cats", lang, query), undefined, { locale: lang }),
    openDogs: (query?: Record<string, StudioQueryValue>) =>
      router.push(buildStudioRoute("dogs", lang, query), undefined, { locale: lang }),
  };
}
