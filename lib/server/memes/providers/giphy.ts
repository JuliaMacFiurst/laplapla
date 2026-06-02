import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { inferMediaType, isSafeMediaText, normalizeTags } from "../normalize";

const MAX_QUERY_LENGTH = 160;
const LAPLAPLA_TAG = "laplapla";

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);
}

function pickGifMp4(item: any) {
  return (
    item?.images?.fixed_height?.mp4 ||
    item?.images?.fixed_width?.mp4 ||
    item?.images?.downsized_small?.mp4 ||
    item?.images?.original?.mp4 ||
    item?.images?.looping?.mp4 ||
    ""
  );
}

function pickGifUrl(item: any) {
  return item?.images?.original?.url || item?.images?.downsized_large?.url || "";
}

function pickPreviewUrl(item: any) {
  return (
    item?.images?.fixed_width_small?.webp ||
    item?.images?.preview_gif?.url ||
    item?.images?.fixed_width_small?.url ||
    pickGifUrl(item)
  );
}

function pickStickerUrl(item: any) {
  return (
    item?.images?.fixed_height?.webp ||
    item?.images?.downsized_medium?.url ||
    item?.images?.original?.webp ||
    item?.images?.original?.url ||
    ""
  );
}

function toMedia(item: any, sticker: boolean): RawProviderMedia | null {
  const providerId = String(item?.id || "");
  const title = String(item?.title || "");
  const username = String(item?.username || "");
  const slug = String(item?.slug || "");
  if (!providerId || !isSafeMediaText(title, username, slug)) return null;

  const mediaUrl = sticker ? pickStickerUrl(item) : pickGifMp4(item) || pickGifUrl(item);
  const previewUrl = pickPreviewUrl(item);
  if (!mediaUrl || !previewUrl) return null;

  return {
    provider: "giphy",
    providerId,
    type: sticker ? "sticker" : inferMediaType(mediaUrl, "gif"),
    media_url: mediaUrl,
    preview_url: previewUrl,
    width: Number(item?.images?.original?.width || item?.images?.fixed_height?.width) || undefined,
    height: Number(item?.images?.original?.height || item?.images?.fixed_height?.height) || undefined,
    tags: normalizeTags([title, username, sticker ? "sticker" : "gif"]),
    nsfw: false,
    source_url: item?.url,
    author: username || undefined,
    popularity: Number(item?.trending_datetime ? 80 : 50),
    raw: item,
  };
}

async function fetchGiphy(path: string, params: URLSearchParams, signal?: AbortSignal) {
  const response = await fetch(`https://api.giphy.com/v1/${path}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`GIPHY request failed: ${response.status}`);
  return response.json();
}

export async function searchGiphy(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) return [];

  const query = normalizeQuery(params.query || params.category || "");
  const limit = Math.min(50, Math.max(1, params.limit + params.offset));
  const wantsStickers = !params.types?.length || params.types.includes("sticker");
  const wantsGifs = !params.types?.length || params.types.some((type) => type === "gif" || type === "mp4" || type === "webm");

  const requests: Array<Promise<RawProviderMedia[]>> = [];

  if (wantsGifs && query) {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      q: query,
      limit: String(limit),
      rating: "g",
    });
    requests.push(
      fetchGiphy("gifs/search", searchParams, params.signal)
        .then((json) => (json?.data || []).map((item: any) => toMedia(item, false)).filter(Boolean)),
    );
  }

  if (wantsStickers) {
    const searchParams = new URLSearchParams({
      api_key: apiKey,
      limit: String(Math.min(24, limit)),
      rating: "g",
    });
    if (query) searchParams.set("q", `${LAPLAPLA_TAG} ${query}`);
    requests.push(
      fetchGiphy(query ? "stickers/search" : "stickers/trending", searchParams, params.signal)
        .then((json) => (json?.data || []).map((item: any) => toMedia(item, true)).filter(Boolean)),
    );
  }

  const settled = await Promise.allSettled(requests);
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
