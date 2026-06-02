import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { isSafeMediaText, normalizeTags } from "../normalize";

let templateCache: { expiresAt: number; items: any[] } | null = null;

export async function searchImgflip(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const query = params.query.trim().toLowerCase();
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
      return (!query || name.toLowerCase().includes(query)) && isSafeMediaText(name);
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
