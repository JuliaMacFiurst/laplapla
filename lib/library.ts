import type { Lang } from "@/i18n";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import {
  getBedtimeStoryPreviewUrl,
  getLocalizedBedtimeStoryPages,
  isPublicBedtimeStoryRow,
  isValidBedtimeStorySlug,
} from "@/lib/bedtimeStories";

export type LibraryContentType = "slideshow" | "video" | "image";

export type LibraryCategory = {
  slug: string;
  label: string;
};

export type LibraryItem = {
  id: string;
  slug: string;
  contentType: LibraryContentType;
  title: string;
  description: string;
  previewUrl: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  pageUrls: string[];
  categories: LibraryCategory[];
  locale: Lang;
  publishedAt: string | null;
  createdAt: string | null;
};

export type LibraryQuery = {
  locale: Lang;
  query?: string;
  category?: string;
  contentType?: LibraryContentType;
  limit?: number;
  offset?: number;
};

export type LibraryRow = {
  id: string;
  slug: string;
  title: unknown;
  description?: unknown;
  content_type?: unknown;
  media?: unknown;
  cover_image_url: string | null;
  exported_image_urls: unknown;
  slides?: unknown;
  status?: string;
  is_published?: boolean;
  publish_date?: string | null;
  created_at: string | null;
};

type CategoryRow = {
  story_id?: unknown;
  library_categories?: unknown;
};

const LANGS: Lang[] = ["ru", "en", "he"];
const EXPANDED_COLUMNS = "id, slug, title, description, content_type, media, cover_image_url, exported_image_urls, slides, status, is_published, publish_date, created_at";
const LEGACY_COLUMNS = "id, slug, title, cover_image_url, exported_image_urls, slides, status, is_published, publish_date, created_at";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function humanizeSlug(slug: string) {
  return slug.split(/[-_]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function localizedText(value: unknown, locale: Lang, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (isRecord(value)) {
    for (const lang of [locale, ...LANGS]) {
      const candidate = value[lang];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return fallback;
}

function defaultDescription(title: string, locale: Lang) {
  if (locale === "en") return `${title} — a visual story to watch and discover at LapLapLa.`;
  if (locale === "he") return `${title} — סיפור חזותי לצפייה ולגילוי ב־LapLapLa.`;
  return `${title} — визуальная история, которую можно посмотреть и исследовать в LapLapLa.`;
}

function normalizeContentType(value: unknown): LibraryContentType {
  return value === "video" || value === "image" ? value : "slideshow";
}

function localizedMedia(value: unknown, locale: Lang) {
  if (!isRecord(value)) return {} as Record<string, unknown>;
  const localized = value[locale];
  return isRecord(localized) ? { ...value, ...localized } : value;
}

function normalizeCategory(value: unknown, locale: Lang): LibraryCategory | null {
  if (!isRecord(value) || typeof value.slug !== "string" || !value.slug.trim()) return null;
  return {
    slug: value.slug.trim(),
    label: localizedText(value.labels, locale, humanizeSlug(value.slug)),
  };
}

export function isPublicLibraryRow(row: LibraryRow) {
  return isPublicBedtimeStoryRow(row) || (
    row.status === "published" && row.is_published === true &&
    (!row.publish_date || new Date(row.publish_date).getTime() <= Date.now())
  );
}

export function normalizeLibraryItem(
  row: LibraryRow,
  locale: Lang,
  categories: LibraryCategory[] = [],
): LibraryItem | null {
  if (!isPublicLibraryRow(row) || !isValidBedtimeStorySlug(row.slug)) return null;

  const contentType = normalizeContentType(row.content_type);
  const title = localizedText(row.title, locale, humanizeSlug(row.slug));
  const description = localizedText(row.description, locale, defaultDescription(title, locale));
  const media = localizedMedia(row.media, locale);
  const mediaUrl = typeof media.url === "string" && media.url.trim() ? media.url.trim() : null;
  const posterUrl = typeof media.posterUrl === "string" && media.posterUrl.trim() ? media.posterUrl.trim() : null;
  const mediaMimeType = typeof media.mimeType === "string" && media.mimeType.trim() ? media.mimeType.trim() : null;
  const { pageUrls } = getLocalizedBedtimeStoryPages(row.exported_image_urls, locale, {
    slides: row.slides,
    cover_image_url: row.cover_image_url,
  });
  const previewUrl = contentType === "slideshow"
    ? getBedtimeStoryPreviewUrl(pageUrls[0], row.cover_image_url, locale)
    : posterUrl || row.cover_image_url || (contentType === "image" ? mediaUrl : "") || "";

  if (!previewUrl || (contentType === "slideshow" && pageUrls.length === 0) || (contentType !== "slideshow" && !mediaUrl)) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    contentType,
    title,
    description,
    previewUrl,
    mediaUrl,
    mediaMimeType,
    pageUrls: contentType === "slideshow" ? pageUrls : [],
    categories,
    locale,
    publishedAt: row.publish_date || null,
    createdAt: row.created_at,
  };
}

async function loadRows() {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  const expanded = await supabase.from("bedtime_stories").select(EXPANDED_COLUMNS).order("created_at", { ascending: false });
  if (!expanded.error) return (expanded.data || []) as LibraryRow[];

  // Deployment-safe fallback while the additive migration is pending.
  const legacy = await supabase.from("bedtime_stories").select(LEGACY_COLUMNS).order("created_at", { ascending: false });
  if (legacy.error) throw legacy.error;
  return (legacy.data || []) as LibraryRow[];
}

async function loadCategoryMap(storyIds: string[], locale: Lang) {
  const result = new Map<string, LibraryCategory[]>();
  if (storyIds.length === 0) return result;
  const { data, error } = await createServerSupabaseClient({ serviceRole: true })
    .from("bedtime_story_categories")
    .select("story_id, library_categories(slug, labels)")
    .in("story_id", storyIds);
  if (error) return result;

  for (const row of (data || []) as CategoryRow[]) {
    if (typeof row.story_id !== "string") continue;
    const raw = Array.isArray(row.library_categories) ? row.library_categories[0] : row.library_categories;
    const category = normalizeCategory(raw, locale);
    if (category) result.set(row.story_id, [...(result.get(row.story_id) || []), category]);
  }
  return result;
}

export async function loadLibraryItems(options: LibraryQuery): Promise<LibraryItem[]> {
  const rows = (await loadRows()).filter(isPublicLibraryRow);
  const categoryMap = await loadCategoryMap(rows.map((row) => row.id), options.locale);
  const normalized = rows
    .map((row) => normalizeLibraryItem(row, options.locale, categoryMap.get(row.id) || []))
    .filter((item): item is LibraryItem => Boolean(item));
  const query = options.query?.trim().toLocaleLowerCase(options.locale) || "";
  const filtered = normalized.filter((item) =>
    (!options.contentType || item.contentType === options.contentType) &&
    (!options.category || item.categories.some((category) => category.slug === options.category)) &&
    (!query || `${item.title}\n${item.description}`.toLocaleLowerCase(options.locale).includes(query))
  );
  const offset = Math.max(0, options.offset || 0);
  const limit = Math.max(1, Math.min(options.limit || 100, 100));
  return filtered.slice(offset, offset + limit);
}

export async function loadLibraryItemBySlug(slug: string, locale: Lang) {
  if (!isValidBedtimeStorySlug(slug)) return null;
  const items = await loadLibraryItems({ locale, limit: 100 });
  return items.find((item) => item.slug === slug) || null;
}

export async function loadLatestLibraryItem(locale: Lang) {
  return (await loadLibraryItems({ locale, limit: 1 }))[0] || null;
}

export function buildLibrarySitemapEntries(rows: LibraryRow[]) {
  return rows.flatMap((row) => {
    if (!isPublicLibraryRow(row) || !isValidBedtimeStorySlug(row.slug)) return [];
    const type = normalizeContentType(row.content_type);
    const title = isRecord(row.title) ? row.title : {};
    const media = isRecord(row.media) ? row.media : {};
    const exported = isRecord(row.exported_image_urls) ? row.exported_image_urls : {};
    const eligibleLangs = LANGS.filter((lang) => {
      if (type === "slideshow") return typeof exported[`${lang}-01`] === "string";
      const localized = isRecord(media[lang]) ? media[lang] as Record<string, unknown> : media;
      return typeof title[lang] === "string" && typeof localized.url === "string";
    });
    return eligibleLangs.length ? [{ path: `/library/${row.slug}`, eligibleLangs }] : [];
  });
}

export async function loadLibrarySitemapEntries() {
  return buildLibrarySitemapEntries(await loadRows());
}
