import type { GetServerSideProps } from "next";
import { normalizeSiteUrl } from "@/lib/config";
import type { Lang } from "@/i18n";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

const CORE_SITEMAP_PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/cats", priority: "0.86", changefreq: "weekly" },
  { path: "/dog", priority: "0.86", changefreq: "weekly" },
  { path: "/capybara", priority: "0.86", changefreq: "weekly" },
  { path: "/books/kladbishenskaya-kniga", priority: "0.78", changefreq: "monthly" },
  { path: "/parrots", priority: "0.84", changefreq: "weekly" },
  { path: "/raccoons", priority: "0.84", changefreq: "weekly" },
  { path: "/about", priority: "0.82", changefreq: "monthly" },
  { path: "/author", priority: "0.8", changefreq: "monthly" },
] as const;

const SITEMAP_LANGS: Lang[] = ["ru", "en", "he"];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function buildAbsoluteUrl(baseUrl: string, path: string, lang: Lang) {
  const localizedPath = buildLocalizedPublicPath(path, lang);
  return `${baseUrl}${localizedPath === "/" ? "" : localizedPath}`;
}

function buildAlternateTags(baseUrl: string, path: string) {
  const alternates = [
    ...SITEMAP_LANGS.map((lang) => ({
      hreflang: lang,
      href: buildAbsoluteUrl(baseUrl, path, lang),
    })),
    {
      hreflang: "x-default",
      href: buildAbsoluteUrl(baseUrl, path, "ru"),
    },
  ];

  return alternates
    .map(
      ({ hreflang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`,
    )
    .join("\n");
}

type SitemapEntry = {
  url: string;
  path: string;
  priority?: string;
  changefreq?: string;
};

function buildSitemapXml(entries: SitemapEntry[], baseUrl: string) {
  const body = entries
    .map(({ url, path, priority, changefreq }) => {
      const changefreqTag = changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : "";
      const priorityTag = priority ? `\n    <priority>${priority}</priority>` : "";
      const alternateTags = buildAlternateTags(baseUrl, path);
      return `  <url>\n    <loc>${escapeXml(url)}</loc>\n${alternateTags}${changefreqTag}${priorityTag}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = normalizeSiteUrl(process.env["NEXT_PUBLIC_SITE_URL"]);
  const entries = CORE_SITEMAP_PAGES.flatMap(({ path, priority, changefreq }) =>
    SITEMAP_LANGS.map((lang) => ({
      path,
      url: buildAbsoluteUrl(baseUrl, path, lang),
      priority,
      changefreq,
    })),
  );

  res.setHeader("Content-Type", "application/xml");
  res.write(buildSitemapXml(entries, baseUrl));
  res.end();

  return {
    props: {},
  };
};

export default function SitemapXml() {
  return null;
}
