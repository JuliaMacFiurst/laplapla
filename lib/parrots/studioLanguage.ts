import type { Lang } from "@/i18n";
import { persistLanguagePreference } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";

export function prepareParrotStudioLanguageSwitch(nextLang: Lang, styleSlug: string) {
  persistLanguagePreference(nextLang);
  return {
    route: buildStudioRoute("parrot", nextLang, { style: styleSlug }),
    locale: nextLang,
  };
}

export function shouldResetParrotCompositionForStyle(
  previousStyleSlug: string | null,
  nextStyleSlug: string,
) {
  return previousStyleSlug !== nextStyleSlug;
}
