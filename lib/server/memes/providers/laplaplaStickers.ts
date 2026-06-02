import { getMemoryCache, setMemoryCache } from "@/lib/server/memoryCache";
import { listR2Objects } from "@/lib/r2";
import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { isSafeMediaText, normalizeTags } from "../normalize";

const STICKERS_PREFIX = "stickers/";
const CACHE_KEY = "laplapla-stickers:r2";
const CACHE_TTL_MS = 30 * 60 * 1000;
const STICKER_EXTENSIONS = /\.(png|apng|webp|gif)(?:$|\?)/i;

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagsFromKey(key: string) {
  return normalizeTags(
    key
      .replace(/^stickers\//, "")
      .split("/")
      .flatMap((part) => normalizeSearchText(part).split(/\s+/)),
  );
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

export async function searchLapLapLaStickers(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const wantsStickers = !params.types?.length || params.types.includes("sticker");
  if (!wantsStickers) return [];

  const queryTerms = normalizeSearchText(params.query)
    .split(/\s+/)
    .filter((term) => term.length > 1);

  const items = await listStickerObjects();
  const filtered = queryTerms.length
    ? items.filter((item) => {
        const haystack = normalizeSearchText([
          item.providerId,
          ...(item.tags || []),
        ].join(" "));
        return queryTerms.some((term) => haystack.includes(term)) && isSafeMediaText(haystack);
      })
    : items.filter((item) => isSafeMediaText(item.providerId, ...(item.tags || [])));

  return filtered.slice(params.offset, params.offset + params.limit);
}
