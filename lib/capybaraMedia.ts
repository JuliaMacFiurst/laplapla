import { searchUnifiedMemes } from "@/lib/server/memes/search";

const buildSearchQuery = (keywords?: string[], mood?: string) => {
  const parts = ["capybara", ...(keywords || []), mood].filter(Boolean);
  return Array.from(new Set(parts)).join(" ");
};

const shuffle = <T,>(items: T[]) =>
  items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export const getMediaQuery = (keywords?: string[], mood?: string) =>
  buildSearchQuery(keywords, mood) || "capybara";

export const fetchCapybaraImages = async (query: string) => {
  const response = await searchUnifiedMemes({
      query,
      lang: "ru",
      limit: 12,
      offset: 0,
      providers: ["pexels"],
      types: ["image"],
  });

  return shuffle(response.items)
    .map((item) => ({
      type: "image" as const,
      imageUrl: item.media_url,
      imageAlt: item.tags.join(", ") || "Capybara",
    }))
    .filter((photo) => photo.imageUrl);
};

export const fetchCapybaraGifs = async (query: string) => {
  const response = await searchUnifiedMemes({
    query,
    lang: "ru",
    limit: 10,
    offset: 0,
    providers: ["giphy"],
    types: ["gif"],
  });

  return shuffle(response.items)
    .map((item) => ({
      type: "gif" as const,
      gifUrl: item.media_url,
    }))
    .filter((item) => item.gifUrl);
};

export const fetchCapybaraVideos = async (query: string) => {
  const response = await searchUnifiedMemes({
    query,
    lang: "ru",
    limit: 10,
    offset: 0,
    providers: ["pexels"],
    types: ["mp4", "webm"],
  });

  return shuffle(response.items)
    .map((item) => ({
      type: "video" as const,
      videoUrl: item.media_url,
      preview: item.preview_url,
    }))
    .filter((video) => video.videoUrl);
};
