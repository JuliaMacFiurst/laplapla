import type { Lang } from "@/i18n";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type BedtimeStoryRow = {
  id: string;
  slug: string;
  title: unknown;
  cover_image_url: string | null;
  exported_image_urls: unknown;
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

const FALLBACK_LANGS: Lang[] = ["ru", "en", "he"];

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
    for (const candidateLang of [lang, ...FALLBACK_LANGS]) {
      const candidate = value[candidateLang];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return humanizeSlug(slug);
}

function pageNumber(key: string) {
  const match = key.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function getLocalizedBedtimeStoryPages(value: unknown, lang: Lang) {
  if (!isRecord(value)) {
    return { assetLang: lang, pageUrls: [] as string[] };
  }

  for (const candidateLang of [lang, ...FALLBACK_LANGS]) {
    const entries = Object.entries(value)
      .filter(([key, url]) => key.startsWith(`${candidateLang}-`) && typeof url === "string" && url.trim())
      .sort(([left], [right]) => pageNumber(left) - pageNumber(right));

    if (entries.length > 0) {
      return {
        assetLang: candidateLang,
        pageUrls: entries.map(([, url]) => String(url)),
      };
    }
  }

  return { assetLang: lang, pageUrls: [] as string[] };
}

export function getBedtimeStoryPreviewUrl(firstPageUrl: string | undefined, fallback: string | null) {
  return firstPageUrl || fallback || "";
}

export function normalizeBedtimeStory(row: BedtimeStoryRow, lang: Lang): BedtimeStory | null {
  const { pageUrls } = getLocalizedBedtimeStoryPages(row.exported_image_urls, lang);
  const previewUrl = getBedtimeStoryPreviewUrl(pageUrls[0], row.cover_image_url);

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

export async function loadBedtimeStories(lang: Lang): Promise<BedtimeStory[]> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("bedtime_stories")
    .select("id, slug, title, cover_image_url, exported_image_urls, created_at")
    .eq("status", "exported")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data || []) as BedtimeStoryRow[])
    .map((row) => normalizeBedtimeStory(row, lang))
    .filter((story): story is BedtimeStory => Boolean(story));
}

export async function loadLatestBedtimeStory(lang: Lang) {
  const stories = await loadBedtimeStories(lang);
  return stories[0] || null;
}
