import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import type { UnifiedMemeMedia, UnifiedMemeProvider, UnifiedMemeMediaType } from "./types";

const SEARCH_TTL_MS = 5 * 60 * 1000;
const MEDIA_TTL_MS = 2 * 60 * 60 * 1000;
const SEARCH_CACHE_VERSION = "v3-r2-sticker-assets";
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const CLEANUP_MAX_AGE_HOURS = 2;
const CLEANUP_KEEP_PER_PROVIDER = 120;
let lastCleanupAt = 0;

type SearchCacheKeyInput = {
  query: string;
  lang: string;
  providers?: UnifiedMemeProvider[];
  types?: UnifiedMemeMediaType[];
  category?: string;
  limit: number;
  offset: number;
};

function sorted(values?: string[]) {
  return [...(values || [])].sort();
}

function buildPersistedSearchQuery(query: string) {
  return `${SEARCH_CACHE_VERSION}:${query.trim().toLowerCase()}`;
}

export function buildSearchCacheKey(input: SearchCacheKeyInput) {
  return [
    "memes",
    SEARCH_CACHE_VERSION,
    input.query.trim().toLowerCase(),
    input.lang,
    input.category || "",
    sorted(input.providers).join(","),
    sorted(input.types).join(","),
    input.limit,
    input.offset,
  ].join(":");
}

function getSupabaseOrNull() {
  try {
    return createServerSupabaseClient({ serviceRole: true });
  } catch {
    return null;
  }
}

function maybeCleanupMemeCache(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  void supabase.rpc("cleanup_meme_engine_cache", {
    p_max_age: `${CLEANUP_MAX_AGE_HOURS} hours`,
    p_keep_per_provider: CLEANUP_KEEP_PER_PROVIDER,
  }).then(({ error }) => {
    if (error) {
      console.error("[meme_cache] cleanup failed", error);
    }
  });
}

function toCacheRow(item: UnifiedMemeMedia) {
  return {
    provider: item.provider,
    provider_id: item.providerId,
    type: item.type,
    preview_url: item.preview_url,
    media_url: item.media_url,
    width: item.width ?? null,
    height: item.height ?? null,
    duration: item.duration ?? null,
    tags: item.tags,
    nsfw: item.nsfw,
    source_url: item.source_url ?? null,
    author: item.author ?? null,
    popularity: item.popularity ?? 0,
    raw: null,
    expires_at: new Date(Date.now() + MEDIA_TTL_MS).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromCacheRow(row: any): UnifiedMemeMedia {
  const providerId = String(row.provider_id || "");
  const stableId = row.provider === "laplapla" && /^r2(?::|-animated:)/.test(providerId)
    ? providerId
    : String(row.id || `${row.provider}:${providerId}`);

  return {
    id: stableId,
    provider: row.provider,
    providerId,
    type: row.type,
    preview_url: row.preview_url || row.media_url,
    media_url: row.media_url,
    width: Number(row.width) || undefined,
    height: Number(row.height) || undefined,
    duration: Number(row.duration) || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    nsfw: Boolean(row.nsfw),
    source_url: row.source_url || undefined,
    author: row.author || undefined,
    popularity: Number(row.popularity) || 0,
    created_at: row.created_at || undefined,
  };
}

export async function upsertMemeMedia(items: UnifiedMemeMedia[]) {
  if (!items.length) return items;
  const supabase = getSupabaseOrNull();
  if (!supabase) return items;

  const { data, error } = await supabase
    .from("meme_cache")
    .upsert(items.map(toCacheRow), { onConflict: "provider,provider_id" })
    .select("*");

  if (error || !data) return items;
  maybeCleanupMemeCache(supabase);
  return data.map(fromCacheRow);
}

export function getMemorySearch(key: string) {
  return getMemoryCache<UnifiedMemeMedia[]>(key);
}

export function setMemorySearch(key: string, items: UnifiedMemeMedia[]) {
  return setMemoryCache(key, items, SEARCH_TTL_MS);
}

export async function getCachedSearch(input: SearchCacheKeyInput) {
  const memoryKey = buildSearchCacheKey(input);
  const memory = getMemorySearch(memoryKey);
  if (memory) return { items: memory, cached: true };

  const supabase = getSupabaseOrNull();
  if (!supabase) return null;

  const providerFilter = sorted(input.providers);
  const typeFilter = sorted(input.types);
  const now = new Date().toISOString();
  const { data: searchRows } = await supabase
    .from("meme_search_cache")
    .select("*")
    .eq("query", buildPersistedSearchQuery(input.query))
    .eq("lang", input.lang)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(20);

  const row = (searchRows || []).find((candidate: any) =>
    JSON.stringify(sorted(candidate.provider_filter || [])) === JSON.stringify(providerFilter) &&
    JSON.stringify(sorted(candidate.type_filter || [])) === JSON.stringify(typeFilter),
  );
  const ids = Array.isArray(row?.result_ids) ? row.result_ids : [];
  if (!ids.length) return null;

  const { data: mediaRows } = await supabase
    .from("meme_cache")
    .select("*")
    .in("id", ids)
    .eq("nsfw", false)
    .gt("expires_at", now);

  const byId = new Map((mediaRows || []).map((mediaRow: any) => [String(mediaRow.id), fromCacheRow(mediaRow)]));
  const items = ids.map((id: string) => byId.get(String(id))).filter(Boolean) as UnifiedMemeMedia[];
  if (!items.length) return null;

  setMemorySearch(memoryKey, items);
  return { items, cached: true };
}

export async function setCachedSearch(input: SearchCacheKeyInput, items: UnifiedMemeMedia[]) {
  const memoryKey = buildSearchCacheKey(input);
  setMemorySearch(memoryKey, items);

  const supabase = getSupabaseOrNull();
  if (!supabase) return;
  const ids = items.map((item) => item.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!ids.length) return;

  await supabase
    .from("meme_search_cache")
    .upsert({
      query: buildPersistedSearchQuery(input.query),
      lang: input.lang,
      provider_filter: sorted(input.providers),
      type_filter: sorted(input.types),
      result_ids: ids,
      expires_at: new Date(Date.now() + SEARCH_TTL_MS).toISOString(),
    }, { onConflict: "query,lang,provider_filter,type_filter" });
}

export async function getTrendingFromCache(category: string) {
  const supabase = getSupabaseOrNull();
  if (!supabase) return [];
  const { data } = await supabase
    .from("meme_trending")
    .select("rank, media:meme_cache(*)")
    .eq("category", category)
    .gt("expires_at", new Date().toISOString())
    .order("rank", { ascending: true })
    .limit(60);

  return (data || [])
    .map((row: any) => row.media ? fromCacheRow(row.media) : null)
    .filter(Boolean) as UnifiedMemeMedia[];
}

export async function setTrendingCache(category: string, items: UnifiedMemeMedia[]) {
  const supabase = getSupabaseOrNull();
  if (!supabase) return;
  const persisted = await upsertMemeMedia(items);
  const rows = persisted
    .filter((item) => /^[0-9a-f-]{36}$/i.test(item.id))
    .map((item, index) => ({
      category,
      media_id: item.id,
      rank: index + 1,
      score: item.popularity ?? 0,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }));
  if (rows.length) {
    await supabase.from("meme_trending").upsert(rows, { onConflict: "category,media_id" });
  }
}
