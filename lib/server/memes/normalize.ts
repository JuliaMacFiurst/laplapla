import type { RawProviderMedia, UnifiedMemeMedia, UnifiedMemeMediaType } from "./types";

export const BLOCKED_MEDIA_TERMS = [
  "kiss",
  "kissing",
  "romance",
  "romantic",
  "couple",
  "wedding",
  "sexy",
  "sensual",
  "lingerie",
  "bikini",
  "smoking",
  "cigarette",
  "tobacco",
  "vape",
  "hookah",
  "alcohol",
  "beer",
  "wine",
  "vodka",
  "drunk",
  "blood",
  "weapon",
  "gun",
  "violence",
  "violent",
  "fight",
  "attack",
  "horror",
  "corpse",
  "dead",
  "death",
  "skull",
  "scary",
  "war",
];

export function isSafeMediaText(...values: Array<string | undefined | null>) {
  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return !BLOCKED_MEDIA_TERMS.some((term) => haystack.includes(term));
}

export function normalizeTags(values: Array<unknown>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value || "").split(/[,#]/))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

export function inferMediaType(url: string, fallback: UnifiedMemeMediaType = "image"): UnifiedMemeMediaType {
  const clean = url.split("?")[0]?.toLowerCase() || "";
  if (clean.endsWith(".mp4") || clean.includes(".mp4?")) return "mp4";
  if (clean.endsWith(".webm") || clean.includes(".webm?")) return "webm";
  if (clean.endsWith(".gif")) return "gif";
  return fallback;
}

export function buildStableMediaId(provider: string, providerId: string) {
  return `${provider}:${providerId}`;
}

export function normalizeMedia(item: RawProviderMedia): UnifiedMemeMedia | null {
  const mediaUrl = String(item.media_url || "").trim();
  const previewUrl = String(item.preview_url || item.media_url || "").trim();
  if (!mediaUrl || !previewUrl || item.nsfw) return null;

  const tags = normalizeTags(item.tags || []);
  if (!isSafeMediaText(...tags, item.author, item.source_url, item.providerId)) return null;

  return {
    id: item.id || buildStableMediaId(item.provider, item.providerId),
    provider: item.provider,
    providerId: item.providerId,
    type: item.type || inferMediaType(mediaUrl),
    preview_url: previewUrl,
    media_url: mediaUrl,
    width: Number(item.width) || undefined,
    height: Number(item.height) || undefined,
    duration: Number(item.duration) || undefined,
    tags,
    nsfw: false,
    source_url: item.source_url,
    author: item.author,
    popularity: Number(item.popularity) || 0,
    created_at: item.created_at,
  };
}

export function dedupeMedia(items: UnifiedMemeMedia[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.provider}:${item.providerId}:${item.media_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
