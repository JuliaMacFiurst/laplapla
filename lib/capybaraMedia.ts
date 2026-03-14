import axios from "axios";

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
  const response = await axios.get("https://api.pexels.com/v1/search", {
    headers: {
      Authorization: process.env.PEXELS_API_KEY || "",
    },
    params: {
      query,
      per_page: 12,
      page: 1,
    },
  });

  const photos = (response.data?.photos || []) as Array<{
    alt?: string;
    src?: { medium?: string; large?: string };
  }>;

  return shuffle(photos)
    .map((photo) => ({
      type: "image" as const,
      imageUrl: photo.src?.large || photo.src?.medium || "",
      imageAlt: photo.alt || "Capybara",
    }))
    .filter((photo) => photo.imageUrl);
};

export const fetchCapybaraGifs = async (query: string) => {
  const response = await axios.get("https://api.giphy.com/v1/gifs/search", {
    params: {
      api_key: process.env.GIPHY_API_KEY || "",
      q: query,
      limit: 10,
      rating: "g",
    },
  });

  const gifs = (response.data?.data || []) as Array<{
    images?: { original?: { url?: string } };
  }>;

  return shuffle(gifs)
    .map((item) => ({
      type: "gif" as const,
      gifUrl: item.images?.original?.url || "",
    }))
    .filter((item) => item.gifUrl);
};

export const fetchCapybaraVideos = async (query: string) => {
  const response = await axios.get("https://api.pexels.com/videos/search", {
    headers: {
      Authorization: process.env.PEXELS_API_KEY || "",
    },
    params: {
      query,
      per_page: 10,
      page: 1,
    },
  });

  const videos = (response.data?.videos || []) as Array<{
    image?: string;
    video_files?: Array<{ quality?: string; link?: string }>;
  }>;

  return shuffle(videos)
    .map((video) => ({
      type: "video" as const,
      videoUrl:
        video.video_files?.find((file) => file.quality === "sd" || file.quality === "hd")?.link || "",
      preview: video.image || "",
    }))
    .filter((video) => video.videoUrl);
};
