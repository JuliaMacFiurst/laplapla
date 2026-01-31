import type { VideoItem } from "./index";

export const shorts: VideoItem[] = [
  {
    id: "animals-short-gleb-1",
    format: "short",
    categoryKey: "animals",

    title: {
      en: "gleb_randalainen",
      ru: "gleb_randalainen",
      he: "gleb_randalainen",
    },

    contentLanguages: ["he", "ru", "en"],

    source: {
      platform: "youtube",
      channelHandle: "@gleb_randalainen",
    },

    youtubeId: "roFi5F-6ZB4",
    languageDependency: "visual",

    status: "approved",
  },

  {
    id: "science-short-gleb-1",
    format: "short",
    categoryKey: "science",

    title: {
      en: "gleb_randalainen",
      ru: "gleb_randalainen",
      he: "gleb_randalainen",
    },

    contentLanguages: ["he"],

    source: {
      platform: "youtube",
      channelHandle: "@gleb_randalainen",
    },

    youtubeId: "0VJWV9W_TiA",
    languageDependency: "visual",

    status: "approved",
  },
];
