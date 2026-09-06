import type { Lang } from "@/i18n";
import { buildCanonicalUrl } from "@/lib/i18n/routing";
import { buildCanonicalMapEntityPath, type CanonicalMapEntityType } from "@/lib/mapEntityRouting";

export type MapSitemapRoute = {
  type: CanonicalMapEntityType;
  slug: string;
  eligibleLocales: Lang[];
};

export function buildMapSitemapEntries(routes: MapSitemapRoute[], baseUrl: string) {
  return routes.flatMap((route) => {
    if (route.eligibleLocales.length === 0) return [];
    const path = buildCanonicalMapEntityPath(route.type, route.slug);
    return route.eligibleLocales.map((lang) => ({
      path,
      url: buildCanonicalUrl(baseUrl, path, lang),
      priority: "0.68",
      changefreq: "monthly",
      eligibleLangs: route.eligibleLocales,
    }));
  });
}
