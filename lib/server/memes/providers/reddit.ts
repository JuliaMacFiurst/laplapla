import type { ProviderSearchParams, RawProviderMedia } from "../types";
import { inferMediaType, isSafeMediaText, normalizeTags } from "../normalize";

const SUBREDDITS = [
  "memes",
  "dankmemes",
  "wholesomememes",
  "reactiongifs",
  "perfectloops",
  "funny",
  "shitposting",
  "cats",
];

function pickRedditMedia(post: any) {
  const fallbackVideo = post?.secure_media?.reddit_video?.fallback_url || post?.media?.reddit_video?.fallback_url;
  if (typeof fallbackVideo === "string" && fallbackVideo) {
    return { mediaUrl: fallbackVideo.replace(/&amp;/g, "&"), type: inferMediaType(fallbackVideo, "mp4") };
  }

  const url = String(post?.url_overridden_by_dest || post?.url || "");
  if (/\.(jpg|jpeg|png|webp|gif|mp4|webm)(?:\?|$)/i.test(url)) {
    return { mediaUrl: url, type: inferMediaType(url, url.toLowerCase().includes(".gif") ? "gif" : "image") };
  }

  const metadata = post?.media_metadata;
  if (metadata && typeof metadata === "object") {
    const first = Object.values(metadata).find((item: any) => item?.s?.u);
    const mediaUrl = String((first as any)?.s?.u || "").replace(/&amp;/g, "&");
    if (mediaUrl) return { mediaUrl, type: inferMediaType(mediaUrl, "image") };
  }

  return null;
}

function pickPreview(post: any, mediaUrl: string) {
  return (
    String(post?.preview?.images?.[0]?.source?.url || "").replace(/&amp;/g, "&") ||
    String(post?.thumbnail || "").replace(/&amp;/g, "&") ||
    mediaUrl
  );
}

async function searchSubreddit(subreddit: string, params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const query = params.query.trim() || params.category || "funny";
  const searchParams = new URLSearchParams({
    q: query,
    restrict_sr: "1",
    include_over_18: "off",
    sort: "relevance",
    limit: String(Math.min(25, params.limit + params.offset)),
  });
  const response = await fetch(`https://www.reddit.com/r/${subreddit}/search.json?${searchParams.toString()}`, {
    headers: { "User-Agent": "LapLapLaStudio/1.0 media search" },
    signal: params.signal,
  });
  if (!response.ok) throw new Error(`Reddit request failed: ${response.status}`);
  const json = await response.json();

  return (json?.data?.children || [])
    .map((child: any): RawProviderMedia | null => {
      const post = child?.data;
      if (!post || post.over_18) return null;
      const media = pickRedditMedia(post);
      const title = String(post.title || "");
      if (!media || !isSafeMediaText(title, subreddit, post.author)) return null;

      return {
        provider: "reddit",
        providerId: String(post.id || `${subreddit}-${media.mediaUrl}`),
        type: media.type,
        media_url: media.mediaUrl,
        preview_url: pickPreview(post, media.mediaUrl),
        width: Number(post?.preview?.images?.[0]?.source?.width) || undefined,
        height: Number(post?.preview?.images?.[0]?.source?.height) || undefined,
        tags: normalizeTags([title, subreddit, post.link_flair_text]),
        nsfw: false,
        source_url: `https://www.reddit.com${post.permalink || ""}`,
        author: post.author,
        popularity: Number(post.score) || 0,
        created_at: post.created_utc ? new Date(Number(post.created_utc) * 1000).toISOString() : undefined,
        raw: post,
      };
    })
    .filter(Boolean) as RawProviderMedia[];
}

export async function searchReddit(params: ProviderSearchParams): Promise<RawProviderMedia[]> {
  const requested = params.providers?.includes("reddit") ?? true;
  if (!requested) return [];
  const subreddits = params.category === "cats" ? ["cats", "funny"] : SUBREDDITS;
  const settled = await Promise.allSettled(subreddits.slice(0, 4).map((subreddit) => searchSubreddit(subreddit, params)));
  return settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}
