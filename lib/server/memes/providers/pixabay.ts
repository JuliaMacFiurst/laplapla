import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { isSafeMediaText, normalizeTags } from "../normalize";

export async function searchPixabay(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];

  const query = (params.query.trim() || params.category || "funny").slice(0, 120);
  const wantsVideo = !params.types?.length || params.types.some((type) => type === "mp4" || type === "webm");
  const wantsImage = !params.types?.length || params.types.includes("image");
  const requests: Array<Promise<RawProviderMedia[]>> = [];

  if (wantsVideo) {
    const searchParams = new URLSearchParams({
      key: apiKey,
      q: query,
      per_page: String(Math.min(50, params.limit + params.offset)),
      safesearch: "true",
      video_type: "all",
    });
    requests.push(
      fetch(`https://pixabay.com/api/videos/?${searchParams.toString()}`, { signal: params.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Pixabay video request failed: ${response.status}`);
          return response.json();
        })
        .then((json) => (json?.hits || []).map((item: any): RawProviderMedia | null => {
          const video = item?.videos?.small || item?.videos?.medium || item?.videos?.tiny;
          const mediaUrl = String(video?.url || "");
          if (!mediaUrl || !isSafeMediaText(item?.tags, item?.user, query)) return null;
          return {
            provider: "pixabay",
            providerId: String(item.id),
            type: "mp4",
            media_url: mediaUrl,
            preview_url: String(item.picture_id ? `https://i.vimeocdn.com/video/${item.picture_id}_640x360.jpg` : item?.pageURL || mediaUrl),
            width: Number(video?.width) || undefined,
            height: Number(video?.height) || undefined,
            duration: Number(item.duration) || undefined,
            tags: normalizeTags([item.tags, "video"]),
            nsfw: false,
            source_url: item.pageURL,
            author: item.user,
            popularity: Number(item.likes || item.views) || 0,
            raw: item,
          };
        }).filter(Boolean)),
    );
  }

  if (wantsImage) {
    const searchParams = new URLSearchParams({
      key: apiKey,
      q: query,
      per_page: String(Math.min(30, params.limit + params.offset)),
      safesearch: "true",
      image_type: "photo",
    });
    requests.push(
      fetch(`https://pixabay.com/api/?${searchParams.toString()}`, { signal: params.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Pixabay image request failed: ${response.status}`);
          return response.json();
        })
        .then((json) => (json?.hits || []).map((item: any): RawProviderMedia | null => {
          const mediaUrl = String(item?.webformatURL || item?.largeImageURL || "");
          if (!mediaUrl || !isSafeMediaText(item?.tags, item?.user, query)) return null;
          return {
            provider: "pixabay",
            providerId: String(item.id),
            type: "image",
            media_url: mediaUrl,
            preview_url: String(item?.previewURL || mediaUrl),
            width: Number(item?.webformatWidth) || undefined,
            height: Number(item?.webformatHeight) || undefined,
            tags: normalizeTags([item.tags, "image"]),
            nsfw: false,
            source_url: item.pageURL,
            author: item.user,
            popularity: Number(item.likes || item.views) || 0,
            raw: item,
          };
        }).filter(Boolean)),
    );
  }

  const settled = await Promise.allSettled(requests);
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
