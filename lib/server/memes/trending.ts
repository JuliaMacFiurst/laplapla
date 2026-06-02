import { getTrendingFromCache, setTrendingCache } from "./cache";
import { searchUnifiedMemes } from "./search";
import type { Lang } from "@/i18n";
import type { UnifiedMemeMedia } from "./types";

export const MEME_TRENDING_CATEGORIES = [
  "funny",
  "shocked",
  "sad",
  "cats",
  "applause",
  "cringe",
  "cinematic",
  "chaos",
] as const;

export type MemeTrendingCategory = typeof MEME_TRENDING_CATEGORIES[number];

export function isMemeTrendingCategory(value: unknown): value is MemeTrendingCategory {
  return typeof value === "string" && MEME_TRENDING_CATEGORIES.includes(value as MemeTrendingCategory);
}

export async function getTrendingMemes(category: string, lang: Lang, limit = 30) {
  const cached = await getTrendingFromCache(category);
  if (cached.length) {
    return { items: cached.slice(0, limit), cached: true };
  }

  const response = await searchUnifiedMemes({
    query: category,
    category,
    lang,
    limit,
    offset: 0,
  });
  await setTrendingCache(category, response.items);
  return { items: response.items, cached: false };
}

export async function refreshTrendingMemes(lang: Lang = "en") {
  const results: Record<string, UnifiedMemeMedia[]> = {};
  for (const category of MEME_TRENDING_CATEGORIES) {
    const { items } = await getTrendingMemes(category, lang, 40);
    await setTrendingCache(category, items);
    results[category] = items;
  }
  return results;
}
