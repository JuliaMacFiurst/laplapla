import type { Lang } from "@/i18n";

export type UnifiedMemeProvider = "giphy" | "reddit" | "imgflip" | "pixabay" | "pexels";

export type UnifiedMemeMediaType = "image" | "gif" | "mp4" | "webm" | "sticker";

export type UnifiedMemeMedia = {
  id: string;
  provider: UnifiedMemeProvider;
  providerId: string;
  type: UnifiedMemeMediaType;
  preview_url: string;
  media_url: string;
  width?: number;
  height?: number;
  duration?: number;
  tags: string[];
  nsfw: boolean;
  source_url?: string;
  author?: string;
  popularity?: number;
  created_at?: string;
};

export type UnifiedMemeSearchParams = {
  query: string;
  limit: number;
  offset: number;
  providers?: UnifiedMemeProvider[];
  types?: UnifiedMemeMediaType[];
  category?: string;
  lang: Lang;
};

export type UnifiedMemeSearchResponse = {
  items: UnifiedMemeMedia[];
  query: string;
  cached: boolean;
  hasMore: boolean;
};

export type ProviderSearchParams = UnifiedMemeSearchParams & {
  signal?: AbortSignal;
};

export type RawProviderMedia = Partial<UnifiedMemeMedia> & {
  provider: UnifiedMemeProvider;
  providerId: string;
  raw?: unknown;
};
