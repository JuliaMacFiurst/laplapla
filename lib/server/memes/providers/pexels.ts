import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { isSafeMediaText, normalizeTags } from "../normalize";

export async function searchPexels(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const query = (params.query.trim() || params.category || "reaction").slice(0, 160);
  const wantsVideo = !params.types?.length || params.types.some((type) => type === "mp4" || type === "webm");
  const wantsImage = !params.types?.length || params.types.includes("image");
  const requests: Array<Promise<RawProviderMedia[]>> = [];

  if (wantsVideo) {
    const searchParams = new URLSearchParams({
      query,
      per_page: String(Math.min(50, params.limit + params.offset)),
    });
    requests.push(
      fetch(`https://api.pexels.com/videos/search?${searchParams.toString()}`, {
        headers: { Authorization: apiKey },
        signal: params.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Pexels video request failed: ${response.status}`);
          return response.json();
        })
        .then((json) => (json?.videos || []).map((video: any): RawProviderMedia | null => {
          const file =
            video?.video_files?.find((candidate: any) => candidate?.file_type === "video/mp4" && candidate?.width >= 720) ||
            video?.video_files?.find((candidate: any) => candidate?.file_type === "video/mp4");
          const mediaUrl = String(file?.link || "");
          const author = String(video?.user?.name || "");
          if (!mediaUrl || !isSafeMediaText(video?.url, author, query)) return null;
          return {
            provider: "pexels",
            providerId: String(video.id),
            type: "mp4",
            media_url: mediaUrl,
            preview_url: String(video?.image || mediaUrl),
            width: Number(file?.width || video?.width) || undefined,
            height: Number(file?.height || video?.height) || undefined,
            duration: Number(video?.duration) || undefined,
            tags: normalizeTags([query, "video"]),
            nsfw: false,
            source_url: video?.url,
            author,
            popularity: 60,
            raw: video,
          };
        }).filter(Boolean)),
    );
  }

  if (wantsImage) {
    const searchParams = new URLSearchParams({
      query,
      per_page: String(Math.min(30, params.limit + params.offset)),
    });
    requests.push(
      fetch(`https://api.pexels.com/v1/search?${searchParams.toString()}`, {
        headers: { Authorization: apiKey },
        signal: params.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Pexels image request failed: ${response.status}`);
          return response.json();
        })
        .then((json) => (json?.photos || []).map((photo: any): RawProviderMedia | null => {
          const mediaUrl = String(photo?.src?.large || photo?.src?.medium || photo?.src?.original || "");
          const author = String(photo?.photographer || "");
          if (!mediaUrl || !isSafeMediaText(photo?.alt, author, query)) return null;
          return {
            provider: "pexels",
            providerId: String(photo.id),
            type: "image",
            media_url: mediaUrl,
            preview_url: String(photo?.src?.medium || mediaUrl),
            width: Number(photo?.width) || undefined,
            height: Number(photo?.height) || undefined,
            tags: normalizeTags([photo?.alt, query, "image"]),
            nsfw: false,
            source_url: photo?.url,
            author,
            popularity: 40,
            raw: photo,
          };
        }).filter(Boolean)),
    );
  }

  const settled = await Promise.allSettled(requests);
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
