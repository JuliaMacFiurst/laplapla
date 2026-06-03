import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { listR2Objects } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { isSafeMediaText, normalizeTags } from "../normalize";

const STICKERS_PREFIX = "stickers/";
const CACHE_KEY = "laplapla-stickers:r2";
const CACHE_TTL_MS = 30 * 60 * 1000;
const STICKER_EXTENSIONS = /\.(png|apng|webp|gif)(?:$|\?)/i;
const MAX_TABLE_ROWS = 1200;
const EMPTY_QUERY_TABLE_LIMIT = 36;

type StickerAssetRow = {
  id: string;
  title: string | null;
  slug: string | null;
  tags: string[] | null;
  storage_path: string | null;
  public_url: string | null;
  set_key: string | null;
  source_path: string | null;
  width: number | null;
  height: number | null;
  updated_at: string | null;
  created_at: string | null;
};

type AnimatedStickerAssetRow = {
  id: string;
  title: string | null;
  slug: string | null;
  tags: string[] | null;
  animation_url: string | null;
  preview_url: string | null;
  storage_path: string | null;
  preview_storage_path: string | null;
  format: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(query: string) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

function tagsFromKey(key: string) {
  return normalizeTags(
    key
      .replace(/^stickers\//, "")
      .split("/")
      .flatMap((part) => normalizeSearchText(part).split(/\s+/)),
  );
}

function scoreStickerFields(fields: {
  tags?: string[] | null;
  title?: string | null;
  slug?: string | null;
  setKey?: string | null;
  storagePath?: string | null;
  sourcePath?: string | null;
  format?: string | null;
}, terms: string[]) {
  if (!terms.length) return 1;

  const tagsText = normalizeSearchText((fields.tags || []).join(" "));
  const titleText = normalizeSearchText(fields.title || "");
  const slugText = normalizeSearchText(fields.slug || "");
  const setKeyText = normalizeSearchText(fields.setKey || "");
  const pathText = normalizeSearchText([fields.storagePath, fields.sourcePath, fields.format].filter(Boolean).join(" "));

  let score = 0;
  for (const term of terms) {
    if (tagsText.includes(term)) score += 90;
    if (setKeyText.includes(term)) score += 60;
    if (slugText.includes(term)) score += 45;
    if (titleText.includes(term)) score += 30;
    if (pathText.includes(term)) score += 12;
  }

  return score;
}

function buildTags(values: Array<unknown>) {
  return normalizeTags(["laplapla", "sticker", "LapLapLa R2", ...values]);
}

function inferAnimatedMediaType(format?: string | null, url?: string | null): RawProviderMedia["type"] {
  const normalizedFormat = String(format || "").toLowerCase();
  const cleanUrl = String(url || "").split("?")[0]?.toLowerCase() || "";
  if (normalizedFormat === "webm" || cleanUrl.endsWith(".webm")) return "webm";
  if (normalizedFormat === "mp4" || cleanUrl.endsWith(".mp4")) return "mp4";
  if (normalizedFormat === "gif" || cleanUrl.endsWith(".gif")) return "gif";
  return "sticker";
}

function toStaticTableSticker(row: StickerAssetRow, score: number): RawProviderMedia | null {
  const mediaUrl = String(row.public_url || "").trim();
  if (!row.id || !mediaUrl) return null;

  const tags = buildTags([
    ...(row.tags || []),
    row.title,
    row.slug,
    row.set_key,
    row.storage_path,
  ]);
  if (!isSafeMediaText(row.title, row.slug, row.set_key, row.storage_path, ...tags)) return null;

  return {
    id: `r2:${row.id}`,
    provider: "laplapla",
    providerId: `r2:${row.id}`,
    type: "sticker",
    media_url: mediaUrl,
    preview_url: mediaUrl,
    width: Number(row.width) || undefined,
    height: Number(row.height) || undefined,
    tags,
    nsfw: false,
    source_url: row.source_path || row.storage_path || mediaUrl,
    author: "LapLapLa R2",
    popularity: 10000 + score,
    created_at: row.created_at || row.updated_at || undefined,
    raw: {
      sourceLabel: "LapLapLa R2",
      storage_path: row.storage_path,
      set_key: row.set_key,
      tags: row.tags || [],
    },
  };
}

function toAnimatedTableSticker(row: AnimatedStickerAssetRow, score: number): RawProviderMedia | null {
  const mediaUrl = String(row.animation_url || "").trim();
  if (!row.id || !mediaUrl) return null;

  const previewUrl = String(row.preview_url || row.animation_url || "").trim();
  const tags = buildTags([
    "animated",
    ...(row.tags || []),
    row.title,
    row.slug,
    row.format,
    row.storage_path,
  ]);
  if (!isSafeMediaText(row.title, row.slug, row.format, row.storage_path, ...tags)) return null;

  return {
    id: `r2-animated:${row.id}`,
    provider: "laplapla",
    providerId: `r2-animated:${row.id}`,
    type: inferAnimatedMediaType(row.format, row.animation_url),
    media_url: mediaUrl,
    preview_url: previewUrl,
    tags,
    nsfw: false,
    source_url: row.storage_path || mediaUrl,
    author: "LapLapLa R2",
    popularity: 9000 + score,
    created_at: row.created_at || row.updated_at || undefined,
    raw: {
      sourceLabel: "LapLapLa R2",
      storage_path: row.storage_path,
      preview_storage_path: row.preview_storage_path,
      format: row.format,
      tags: row.tags || [],
    },
  };
}

async function listStickerObjects() {
  const cached = getMemoryCache<RawProviderMedia[]>(CACHE_KEY);
  if (cached) return cached;

  const objects = await listR2Objects(STICKERS_PREFIX);
  const items = objects
    .filter((object) => {
      const relativePath = object.key.replace(/^stickers\//, "");
      return relativePath.includes("/") && STICKER_EXTENSIONS.test(object.key);
    })
    .map((object): RawProviderMedia => {
      const tags = tagsFromKey(object.key);
      return {
        provider: "laplapla",
        providerId: object.key,
        type: "sticker",
        media_url: object.url,
        preview_url: object.url,
        tags: tags.length ? tags : ["laplapla", "sticker"],
        nsfw: false,
        source_url: object.url,
        author: "LapLapLa",
        popularity: 1000,
      };
    });

  return setMemoryCache(CACHE_KEY, items, CACHE_TTL_MS);
}

async function searchStickerAssetRows(params: ProviderSearchParams, terms: string[]) {
  const supabase = createServerSupabaseClient();
  const baseQuery = supabase
    .from("sticker_assets")
    .select("id,title,slug,tags,storage_path,public_url,set_key,source_path,width,height,updated_at,created_at")
    .not("public_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(terms.length ? MAX_TABLE_ROWS : EMPTY_QUERY_TABLE_LIMIT);

  const { data, error } = await baseQuery;
  if (error || !data) {
    if (error) console.error("[laplaplaStickers] sticker_assets query failed", error);
    return [];
  }

  return (data as StickerAssetRow[])
    .map((row) => ({
      row,
      score: scoreStickerFields({
        tags: row.tags,
        title: row.title,
        slug: row.slug,
        setKey: row.set_key,
        storagePath: row.storage_path,
        sourcePath: row.source_path,
      }, terms),
    }))
    .filter((item) => !terms.length || item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, params.offset + params.limit)
    .map((item) => toStaticTableSticker(item.row, item.score))
    .filter(Boolean) as RawProviderMedia[];
}

async function searchAnimatedStickerAssetRows(params: ProviderSearchParams, terms: string[]) {
  const wantsAnimated =
    !params.types?.length ||
    params.types.includes("sticker") ||
    params.types.includes("gif") ||
    params.types.includes("mp4") ||
    params.types.includes("webm");

  if (!wantsAnimated) return [];

  const supabase = createServerSupabaseClient();
  const baseQuery = supabase
    .from("animated_sticker_assets")
    .select("id,title,slug,tags,animation_url,preview_url,storage_path,preview_storage_path,format,updated_at,created_at")
    .not("animation_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(terms.length ? MAX_TABLE_ROWS : EMPTY_QUERY_TABLE_LIMIT);

  const { data, error } = await baseQuery;
  if (error || !data) {
    if (error) console.error("[laplaplaStickers] animated_sticker_assets query failed", error);
    return [];
  }

  return (data as AnimatedStickerAssetRow[])
    .map((row) => ({
      row,
      score: scoreStickerFields({
        tags: row.tags,
        title: row.title,
        slug: row.slug,
        storagePath: row.storage_path,
        format: row.format,
      }, terms),
    }))
    .filter((item) => !terms.length || item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, params.offset + params.limit)
    .map((item) => toAnimatedTableSticker(item.row, item.score))
    .filter(Boolean) as RawProviderMedia[];
}

async function searchTableStickers(params: ProviderSearchParams, terms: string[]) {
  try {
    const [staticItems, animatedItems] = await Promise.all([
      searchStickerAssetRows(params, terms),
      searchAnimatedStickerAssetRows(params, terms),
    ]);

    return [...staticItems, ...animatedItems];
  } catch (error) {
    console.error("[laplaplaStickers] table sticker search failed", error);
    return [];
  }
}

export async function searchLapLapLaStickers(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const wantsStickers = !params.types?.length || params.types.includes("sticker");
  if (!wantsStickers) return [];

  const queryTerms = tokenizeQuery(params.query);

  const [tableItems, listedItems] = await Promise.all([
    searchTableStickers(params, queryTerms),
    listStickerObjects(),
  ]);
  const filteredListed = queryTerms.length
    ? listedItems.filter((item) => {
        const haystack = normalizeSearchText([
          item.providerId,
          ...(item.tags || []),
        ].join(" "));
        return queryTerms.some((term) => haystack.includes(term)) && isSafeMediaText(haystack);
      })
    : listedItems.filter((item) => isSafeMediaText(item.providerId, ...(item.tags || [])));

  const seen = new Set<string>();
  return [...tableItems, ...filteredListed]
    .filter((item) => {
      const key = `${item.providerId}:${item.media_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(params.offset, params.offset + params.limit);
}
