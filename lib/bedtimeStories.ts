import type { Lang } from "@/i18n";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type BedtimeStoryRow = {
  id: string;
  slug: string;
  title: unknown;
  cover_image_url: string | null;
  exported_image_urls: unknown;
  slides?: unknown;
  status?: string;
  is_published?: boolean;
  publish_date?: string | null;
  created_at: string | null;
};

export type BedtimeStory = {
  id: string;
  slug: string;
  title: string;
  previewUrl: string;
  pageUrls: string[];
  createdAt: string | null;
};

const TITLE_FALLBACK_LANGS: Lang[] = ["ru", "en", "he"];
const PUBLIC_STORY_COLUMNS = "id, slug, title, cover_image_url, exported_image_urls, slides, status, is_published, publish_date, created_at";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function humanizeSlug(slug: string) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getLocalizedTitle(value: unknown, lang: Lang, slug: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (isRecord(value)) {
    for (const candidateLang of [lang, ...TITLE_FALLBACK_LANGS]) {
      const candidate = value[candidateLang];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return humanizeSlug(slug);
}

export function isNonRussianUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return /\/(?:en|he)\//i.test(url);
}

export function getLocalizedBedtimeStoryPages(
  value: unknown,
  lang: Lang,
  legacyFallback?: {
    slides?: unknown;
    cover_image_url?: string | null;
  },
) {
  const pageUrls: string[] = [];

  if (isRecord(value)) {
    // Read canonical pages in numeric order, starting at 01. Never use another language.
    for (let page = 1; page <= 999; page += 1) {
      const key = `${lang}-${String(page).padStart(2, "0")}`;
      const url = value[key];
      if (typeof url !== "string" || !url.trim()) break;
      pageUrls.push(url.trim());
    }
  }

  // Legacy fallback strictly for Russian when no exported_image_urls exist for "ru-"
  if (pageUrls.length === 0 && lang === "ru") {
    if (Array.isArray(legacyFallback?.slides) && legacyFallback.slides.length > 0) {
      const legacyUrls: string[] = [];
      for (let i = 0; i < legacyFallback.slides.length; i++) {
        const slide = legacyFallback.slides[i];
        let url = isRecord(slide) && typeof slide.image_url === "string" ? slide.image_url.trim() : "";
        if (isNonRussianUrl(url)) {
          url = "";
        }
        if (i === 0 && !url && legacyFallback?.cover_image_url && !isNonRussianUrl(legacyFallback.cover_image_url)) {
          url = legacyFallback.cover_image_url.trim();
        }
        if (url) {
          legacyUrls.push(url);
        }
      }
      if (legacyUrls.length > 0) {
        pageUrls.push(...legacyUrls);
      }
    } else if (legacyFallback?.cover_image_url && !isNonRussianUrl(legacyFallback.cover_image_url)) {
      pageUrls.push(legacyFallback.cover_image_url.trim());
    }
  }

  return { assetLang: lang, pageUrls };
}

export function getBedtimeStoryPreviewUrl(
  firstPageUrl: string | undefined,
  fallback: string | null = null,
  lang: Lang = "ru",
) {
  if (firstPageUrl && firstPageUrl.trim()) {
    return firstPageUrl.trim();
  }
  if (lang === "ru" && fallback && fallback.trim() && !isNonRussianUrl(fallback)) {
    return fallback.trim();
  }
  return "";
}

export function normalizeBedtimeStory(row: BedtimeStoryRow, lang: Lang): BedtimeStory | null {
  const { pageUrls } = getLocalizedBedtimeStoryPages(row.exported_image_urls, lang, {
    slides: row.slides,
    cover_image_url: row.cover_image_url,
  });
  const previewUrl = getBedtimeStoryPreviewUrl(pageUrls[0], row.cover_image_url, lang);

  if (!previewUrl || pageUrls.length === 0) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    title: getLocalizedTitle(row.title, lang, row.slug),
    previewUrl,
    pageUrls,
    createdAt: row.created_at,
  };
}

export function isValidBedtimeStorySlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isPublicBedtimeStoryRow(row: BedtimeStoryRow, now = new Date()): boolean {
  if (row.status !== "exported" || row.is_published !== true || !row.publish_date) {
    return false;
  }
  const publishTime = Date.parse(row.publish_date);
  return Number.isFinite(publishTime) && publishTime <= now.getTime();
}

function publicStoriesQuery() {
  const now = new Date().toISOString();
  return createServerSupabaseClient({ serviceRole: true })
    .from("bedtime_stories")
    .select(PUBLIC_STORY_COLUMNS)
    .eq("status", "exported")
    .eq("is_published", true)
    .not("publish_date", "is", null)
    .lte("publish_date", now);
}

export async function loadBedtimeStories(lang: Lang): Promise<BedtimeStory[]> {
  const { data, error } = await publicStoriesQuery()
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as BedtimeStoryRow[])
    .filter((row) => isPublicBedtimeStoryRow(row))
    .map((row) => normalizeBedtimeStory(row, lang))
    .filter((story): story is BedtimeStory => Boolean(story));
}

export async function loadBedtimeStoryBySlug(slug: string, lang: Lang): Promise<BedtimeStory | null> {
  if (!isValidBedtimeStorySlug(slug)) {
    return null;
  }

  const { data, error } = await publicStoriesQuery()
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as BedtimeStoryRow | null;
  return row && isPublicBedtimeStoryRow(row) ? normalizeBedtimeStory(row, lang) : null;
}

export type BedtimeStorySitemapEntry = {
  path: string;
  eligibleLangs: Lang[];
};

export function buildBedtimeStorySitemapEntries(rows: BedtimeStoryRow[], now = new Date()) {
  return rows.flatMap<BedtimeStorySitemapEntry>((row) => {
    if (!isPublicBedtimeStoryRow(row, now) || !isValidBedtimeStorySlug(row.slug) || !isRecord(row.exported_image_urls)) {
      return [];
    }
    const exportedImageUrls = row.exported_image_urls;
    const eligibleLangs = TITLE_FALLBACK_LANGS.filter((lang) => {
      const firstPage = exportedImageUrls[`${lang}-01`];
      return typeof firstPage === "string" && Boolean(firstPage.trim());
    });
    return eligibleLangs.length > 0
      ? [{ path: `/bedtime-stories/${row.slug}`, eligibleLangs }]
      : [];
  });
}

export async function loadBedtimeStorySitemapEntries(): Promise<BedtimeStorySitemapEntry[]> {
  const now = new Date().toISOString();
  const { data, error } = await createServerSupabaseClient({ serviceRole: true })
    .from("bedtime_stories")
    .select("slug, exported_image_urls, status, is_published, publish_date")
    .eq("status", "exported")
    .eq("is_published", true)
    .not("publish_date", "is", null)
    .lte("publish_date", now)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return buildBedtimeStorySitemapEntries((data || []) as BedtimeStoryRow[]);
}

export async function loadLatestBedtimeStory(lang: Lang) {
  const stories = await loadBedtimeStories(lang);
  return stories[0] || null;
}
