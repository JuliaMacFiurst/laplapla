import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { GetServerSideProps } from "next";
import countryNames from "@/utils/country_names.json";
import { createServerSupabaseClient } from "@/lib/server/supabase";

const DEFAULT_SITE_URL = "https://laplapla.com";

const STATIC_PATHS = [
  "/",
  "/raccoons",
  "/dogs",
  "/parrots",
  "/books",
];

const RIVER_SVG_CANDIDATES = [
  path.join(process.cwd(), "public", "rivers", "rivers-with-id-bg-updated.svg"),
  path.join(process.cwd(), "rivers", "rivers-with-id-bg-updated.svg"),
  path.join(process.cwd(), "assets", "rivers", "rivers-with-id-bg-updated.svg"),
];

const FOREST_SVG_CANDIDATES = [
  path.join(process.cwd(), "public", "biomes", "Biomes_of_the_world.svg"),
  path.join(process.cwd(), "biomes", "Biomes_of_the_world.svg"),
  path.join(process.cwd(), "assets", "biomes", "Biomes_of_the_world.svg"),
];

const normalizeBaseUrl = (value: string | undefined) =>
  (value || DEFAULT_SITE_URL).trim().replace(/\/+$/, "") || DEFAULT_SITE_URL;

const normalizeSlug = (value: string) =>
  decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readSvgIds(candidatePaths: string[]) {
  for (const candidatePath of candidatePaths) {
    if (!(await fileExists(candidatePath))) {
      continue;
    }

    const svg = await readFile(candidatePath, "utf8");
    const ids = Array.from(svg.matchAll(/\sid="([^"]+)"/g))
      .map((match) => normalizeSlug(match[1] || ""))
      .filter(Boolean);

    return Array.from(new Set(ids));
  }

  return [];
}

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
      .map((book) => `/books/${normalizeSlug(String(book.slug || book.id || ""))}`)
      .filter((bookPath) => bookPath !== "/books/")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function loadCountryPaths() {
  return Object.keys(countryNames)
    .map((slug) => normalizeSlug(slug))
    .filter(Boolean)
    .map((slug) => `/country/${slug}`);
}

async function loadRiverPaths() {
  const slugs = await readSvgIds(RIVER_SVG_CANDIDATES);
  return slugs.map((slug) => `/river/${slug}`);
}

async function loadForestPaths() {
  const slugs = await readSvgIds(FOREST_SVG_CANDIDATES);
  return slugs.map((slug) => `/forest/${slug}`);
}

function buildSitemapXml(urls: string[]) {
  const body = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = normalizeBaseUrl(process.env["NEXT_PUBLIC_SITE_URL"]);
  const [bookPaths, riverPaths, forestPaths] = await Promise.all([
    loadBookPaths(),
    loadRiverPaths(),
    loadForestPaths(),
  ]);

  const urls = Array.from(
    new Set([
      ...STATIC_PATHS,
      ...loadCountryPaths(),
      ...bookPaths,
      ...riverPaths,
      ...forestPaths,
    ]),
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
