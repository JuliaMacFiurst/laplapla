import type { Lang } from "@/i18n";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type BedtimeStoryRow = {
  id: string;
  slug: string;
  title: unknown;
  cover_image_url: string | null;
  exported_image_urls: unknown;
  slides?: unknown;
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

export async function loadBedtimeStories(lang: Lang): Promise<BedtimeStory[]> {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const { data, error } = await supabase
    .from("bedtime_stories")
    .select("id, slug, title, cover_image_url, exported_image_urls, slides, created_at")
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
