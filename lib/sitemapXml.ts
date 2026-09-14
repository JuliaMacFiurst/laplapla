import { normalizeSiteUrl } from "@/lib/config";
import type { Lang } from "@/i18n";
import { buildCanonicalUrl, buildEligibleHreflangLinks, buildHreflangLinks } from "@/lib/i18n/routing";
import { loadRecipeSitemapPaths } from "@/lib/recipes";
import { loadEligibleMapRoutes, type EligibleMapRoute } from "@/lib/server/mapSeoEligibility";
import { buildMapSitemapEntries } from "@/lib/seo/mapSitemapEligibility";
import {
  CORE_SITEMAP_PAGES,
  sitemapContainsOnlyCanonicalPublicUrls,
} from "@/lib/sitemapPolicy";
import { getPublicProductSlugs } from "@/lib/shop/catalog";

const SITEMAP_LANGS: Lang[] = ["ru", "en", "he"];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function buildAbsoluteUrl(baseUrl: string, path: string, lang: Lang) {
  return buildCanonicalUrl(baseUrl, path, lang);
}

function buildAlternateTags(baseUrl: string, path: string, eligibleLangs?: readonly Lang[]) {
  const alternates = eligibleLangs
    ? buildEligibleHreflangLinks(baseUrl, path, eligibleLangs)
    : buildHreflangLinks(baseUrl, path);

  return alternates
    .map(
      ({ hrefLang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(hrefLang)}" href="${escapeXml(href)}" />`,
    )
    .join("\n");
}

type SitemapEntry = {
  url: string;
  path: string;
  priority?: string;
  changefreq?: string;
  eligibleLangs?: readonly Lang[];
};

function buildSitemapXml(entries: SitemapEntry[], baseUrl: string) {
  const body = entries
    .map(({ url, path, priority, changefreq, eligibleLangs }) => {
      const changefreqTag = changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : "";
      const priorityTag = priority ? `\n    <priority>${priority}</priority>` : "";
      const alternateTags = buildAlternateTags(baseUrl, path, eligibleLangs);
      return `  <url>\n    <loc>${escapeXml(url)}</loc>\n${alternateTags}${changefreqTag}${priorityTag}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>`;
}

export async function generateSitemapXml() {
  const baseUrl = normalizeSiteUrl(process.env["NEXT_PUBLIC_SITE_URL"]);
  const recipePaths = await loadRecipeSitemapPaths();
  let mapRoutes: EligibleMapRoute[] = [];
  try {
    mapRoutes = await loadEligibleMapRoutes();
  } catch (error) {
    console.error("[sitemap] failed to load map entity routes", error);
  }
  const recipeEntries = recipePaths.map((path) => ({
    path,
    priority: "0.72",
    changefreq: "weekly",
  }));
  const uniqueEntries = Array.from(
    new Map(
      [...CORE_SITEMAP_PAGES, ...recipeEntries].map((entry) => [entry.path, entry]),
    ).values(),
  );
  
  const shopProductPaths = getPublicProductSlugs().map((slug) => `/shop/${slug}`);
  const shopProductEntries = shopProductPaths.map((path) => ({
    path,
    priority: "0.85",
    changefreq: "weekly",
  }));

  const entries = [
    ...[...uniqueEntries, ...shopProductEntries].flatMap(({ path, priority, changefreq }) =>
      SITEMAP_LANGS.map((lang) => ({
        path,
        url: buildAbsoluteUrl(baseUrl, path, lang),
        priority,
        changefreq,
        eligibleLangs: undefined,
      })),
    ),
    ...buildMapSitemapEntries(mapRoutes, baseUrl),
  ];

  const xml = buildSitemapXml(entries, baseUrl);
  if (!sitemapContainsOnlyCanonicalPublicUrls(xml)) {
    throw new Error("Sitemap contains a non-canonical or technical URL");
  }
  return xml;
}
