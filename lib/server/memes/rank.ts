import type { UnifiedMemeMedia, UnifiedMemeSearchParams } from "./types";

const TYPE_PRIORITY: Record<UnifiedMemeMedia["type"], number> = {
  mp4: 500,
  webm: 450,
  sticker: 350,
  image: 220,
  gif: 80,
};

const PROVIDER_PRIORITY: Record<UnifiedMemeMedia["provider"], number> = {
  giphy: 80,
  reddit: 70,
  pexels: 62,
  pixabay: 60,
  imgflip: 45,
  laplapla: 120,
};

export function rankMedia(items: UnifiedMemeMedia[], params: Pick<UnifiedMemeSearchParams, "query" | "types">) {
  const terms = params.query.toLowerCase().split(/\s+/).filter(Boolean);

  return [...items].sort((left, right) => {
    const leftScore = scoreMedia(left, terms);
    const rightScore = scoreMedia(right, terms);
    return rightScore - leftScore;
  });
}

function scoreMedia(item: UnifiedMemeMedia, terms: string[]) {
  const tagText = item.tags.join(" ").toLowerCase();
  const matchScore = terms.reduce((score, term) => score + (tagText.includes(term) ? 35 : 0), 0);
  const popularityLimit = item.provider === "laplapla" && /^r2(?::|-animated:)/.test(item.providerId)
    ? 20_000
    : 1000;
  const popularity = Math.min(Number(item.popularity) || 0, popularityLimit) / 10;
  return TYPE_PRIORITY[item.type] + PROVIDER_PRIORITY[item.provider] + matchScore + popularity;
}
