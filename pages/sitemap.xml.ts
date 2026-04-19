import type { GetServerSideProps } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { loadSeoRouteSlugs, normalizeEntitySlug } from "@/lib/server/seoEntityPage";
import { buildCanonicalMapEntityPath } from "@/lib/mapEntityRouting";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";
import type { Lang } from "@/i18n";
import { normalizeSiteUrl } from "@/lib/config";

const STATIC_PATHS = [
  "/",
  "/raccoons",
  "/dogs",
  "/parrots",
  "/books",
];
const INDEXABLE_LANGS: Lang[] = ["ru", "en", "he"];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function loadBookPaths() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("books")
      .select("id, slug")
      .order("id", { ascending: true });

    if (error) {
      return [];
    }

    return (data || [])
      .map((book) => `/books/${normalizeEntitySlug(String(book.slug || book.id || ""))}`)
      .filter((bookPath) => bookPath !== "/books/")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildSitemapXml(urls: string[]) {
  const body = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function localizePaths(paths: string[]) {
  return INDEXABLE_LANGS.flatMap((lang) =>
    paths.map((path) => buildLocalizedPublicPath(path, lang)),
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = normalizeSiteUrl(process.env["NEXT_PUBLIC_SITE_URL"]);
  const [bookPaths, seoRouteSlugs] = await Promise.all([
    loadBookPaths(),
    loadSeoRouteSlugs().catch(() => ({
      country: [] as string[],
      animal: [] as string[],
      river: [] as string[],
      sea: [] as string[],
      biome: [] as string[],
    })),
  ]);

  const canonicalPaths = [
    ...STATIC_PATHS,
    ...bookPaths,
    ...seoRouteSlugs.country.map((slug) => buildCanonicalMapEntityPath("country", slug)),
    ...seoRouteSlugs.animal.map((slug) => buildCanonicalMapEntityPath("animal", slug)),
    ...seoRouteSlugs.river.map((slug) => buildCanonicalMapEntityPath("river", slug)),
    ...seoRouteSlugs.sea.map((slug) => buildCanonicalMapEntityPath("sea", slug)),
    ...seoRouteSlugs.biome.map((slug) => buildCanonicalMapEntityPath("biome", slug)),
  ];

  const urls = Array.from(
    new Set(localizePaths(canonicalPaths)),
  ).map((routePath) => `${baseUrl}${routePath === "/" ? "" : routePath}`);

  res.setHeader("Content-Type", "application/xml");
  res.write(buildSitemapXml(urls));
  res.end();

  return {
    props: {},
  };
};

export default function SitemapXml() {
  return null;
}
