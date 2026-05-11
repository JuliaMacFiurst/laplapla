import type { GetServerSideProps } from "next";
import { normalizeSiteUrl } from "@/lib/config";

const CORE_SITEMAP_PAGES = [
  { path: "/", priority: "1.0" },
  { path: "/cats", priority: "0.9" },
  { path: "/dog", priority: "0.9" },
  { path: "/books/kladbishenskaya-kniga", priority: "0.9" },
  { path: "/parrots", priority: "0.9" },
  { path: "/raccoons", priority: "0.9" },
  { path: "/about", priority: "0.8" },
  { path: "/author", priority: "0.8" },
] as const;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function buildSitemapXml(entries: Array<{ url: string; priority?: string }>) {
  const body = entries
    .map(({ url, priority }) => {
      const priorityTag = priority ? `\n    <priority>${priority}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(url)}</loc>${priorityTag}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = normalizeSiteUrl(process.env["NEXT_PUBLIC_SITE_URL"]);
  const entries = CORE_SITEMAP_PAGES.map(({ path, priority }) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    priority,
  }));

  res.setHeader("Content-Type", "application/xml");
  res.write(buildSitemapXml(entries));
  res.end();

  return {
    props: {},
  };
};

export default function SitemapXml() {
  return null;
}
