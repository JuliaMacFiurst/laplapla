import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { isSafeMediaText, normalizeTags } from "../normalize";

let templateCache: { expiresAt: number; items: any[] } | null = null;

const GENERIC_QUERY_TERMS = new Set([
  "fun",
  "funny",
  "gif",
  "image",
  "meme",
  "memes",
  "pic",
  "picture",
  "template",
  "templates",
  "video",
  "мем",
  "мема",
  "мемы",
  "прикол",
  "приколы",
  "смешная",
  "смешное",
  "смешной",
  "смешные",
]);

function getSearchTerms(query: string) {
  return query
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 1 && !GENERIC_QUERY_TERMS.has(term));
}

export async function searchImgflip(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const query = params.query.trim().toLowerCase();
  const searchTerms = getSearchTerms(query);
  const wantsImages = !params.types?.length || params.types.includes("image");
  if (!wantsImages) return [];

  const now = Date.now();
  if (!templateCache || templateCache.expiresAt < now) {
    const response = await fetch("https://api.imgflip.com/get_memes", { signal: params.signal });
    if (!response.ok) throw new Error(`Imgflip request failed: ${response.status}`);
    const json = await response.json();
    templateCache = {
      expiresAt: now + 6 * 60 * 60 * 1000,
      items: Array.isArray(json?.data?.memes) ? json.data.memes : [],
    };
  }

  return templateCache.items
    .filter((item) => {
      const name = String(item?.name || "");
      const normalizedName = name.toLowerCase();
      const matchesQuery = !query || searchTerms.length === 0 || searchTerms.every((term) => normalizedName.includes(term));
      return matchesQuery && isSafeMediaText(name);
    })
    .slice(params.offset, params.offset + params.limit)
    .map((item): RawProviderMedia => ({
      provider: "imgflip",
      providerId: String(item.id),
      type: "image",
      media_url: String(item.url),
      preview_url: String(item.url),
      width: Number(item.width) || undefined,
      height: Number(item.height) || undefined,
      tags: normalizeTags([item.name, "meme template"]),
      nsfw: false,
      source_url: `https://imgflip.com/memegenerator/${item.id}`,
      popularity: Number(item.box_count) || 0,
      raw: item,
    }));
}
